use crate::error::Error;
use async_recursion::async_recursion;
use async_trait::async_trait;
use futures_util::future::try_join_all;
use log::info;
use std::collections::VecDeque;
use std::fmt::{Debug, Display};
use std::iter::FromIterator;
use std::marker::PhantomData;
use std::ops::Deref;
use std::sync::Arc;
use tokio::sync::mpsc::error::SendError;
use tokio::sync::mpsc::{Receiver as MReceiver, Sender as MSender};
use tokio::sync::oneshot::{self, Receiver, Sender};
use tokio::sync::Mutex;
use tokio::task::{JoinError, JoinHandle};

pub enum PoolExecutorError<T: Send + Sync + Unpin, E: Send + Sync + Unpin> {
    ExecuteError(T, E),
    SendError(T),
}

pub enum PoolError<T: Send + Sync + Unpin, E: Send + Sync + Unpin> {
    JoinError(JoinError),
    BatchError(Vec<PoolExecutorError<T, E>>),
}

pub trait Command: Send + Sync + Unpin {
    type CommandDesc: Send + Sync + Unpin + 'static;

    fn get_id(&self) -> &str;
    fn get_desc(&self) -> Self::CommandDesc;
}

#[async_trait]
pub trait Executor {
    type Command: Command;
    type OkType: Send + Sync + Unpin + 'static;
    type ErrorType: Send + Sync + Unpin + 'static;
    // TODO wait associated type with default stable
    // type PoolError: PoolError<Self::CommandDesc, Self::ErrorType>;
    // type PoolExecutorError: PoolExecutorError<Self::CommandDesc, Self::ErrorType>;

    async fn execute(&mut self, command: Self::Command) -> Result<Self::OkType, Self::ErrorType>;
}

pub struct Pool<T: Executor + Send + Sync + Unpin + 'static> {
    name: Arc<String>,
    executors: Arc<Mutex<VecDeque<T>>>,
    waiters: Arc<Mutex<VecDeque<Sender<()>>>>,
}

pub struct PoolRequest<T: Executor + Send + Sync + Unpin + 'static> {
    pool: Pool<T>,
    command: T::Command,
    executor: T,
}

impl<T: Executor + Send + Sync + Unpin> PoolRequest<T> {
    pub async fn execute(mut self) -> Result<T::OkType, T::ErrorType> {
        let PoolRequest {
            pool,
            command,
            mut executor,
        } = self;
        let result = executor.execute(command).await;
        pool.back_executor(executor).await;
        pool.notify_free().await;
        result
    }
}

impl<T: Executor + Send + Sync + Unpin> Clone for Pool<T> {
    fn clone(&self) -> Self {
        Pool {
            name: self.name.clone(),
            executors: self.executors.clone(),
            waiters: self.waiters.clone(),
        }
    }
}

impl<T: Executor + Send + Sync + Unpin> Pool<T> {
    pub fn new(name: String, executors: Vec<T>) -> Self {
        Pool {
            name: Arc::new(name),
            executors: Arc::new(Mutex::new(VecDeque::from(executors))),
            waiters: Arc::new(Mutex::new(VecDeque::new())),
        }
    }

    pub async fn execute(&self, command: T::Command) -> Result<T::OkType, T::ErrorType> {
        let request = self.create_request(command).await;
        request.execute().await
    }

    async fn join_executor_handlers(
        handlers: Vec<
            JoinHandle<
                Result<(), PoolExecutorError<<T::Command as Command>::CommandDesc, T::ErrorType>>,
            >,
        >,
    ) -> Result<(), PoolError<<T::Command as Command>::CommandDesc, T::ErrorType>> {
        match try_join_all(handlers).await {
            Ok(res_list) => {
                let mut failed_list = Vec::new();
                for res in res_list {
                    match res {
                        Ok(()) => continue,
                        Err(e) => failed_list.push(e),
                    }
                }
                if failed_list.len() == 0 {
                    Ok(())
                } else {
                    Err(PoolError::BatchError(failed_list))
                }
            }
            Err(e) => Err(PoolError::JoinError(e)),
        }
    }

    pub async fn batch_execute_with_sender(
        &self,
        commands: Vec<T::Command>,
        sender: MSender<T::OkType>,
    ) -> Result<(), PoolError<<T::Command as Command>::CommandDesc, T::ErrorType>> {
        let sender = Arc::new(sender);
        let mut handlers = Vec::with_capacity(commands.len());
        for command in commands {
            let desc = command.get_desc();
            let request = self.create_request(command).await;
            let sender = sender.clone();
            let handler: JoinHandle<
                Result<(), PoolExecutorError<<T::Command as Command>::CommandDesc, T::ErrorType>>,
            > = tokio::spawn(async move {
                match request.execute().await {
                    Ok(result) => match sender.send(result).await {
                        Ok(()) => Ok(()),
                        Err(_) => Err(PoolExecutorError::SendError(desc)),
                    },
                    Err(e) => Err(PoolExecutorError::ExecuteError(desc, e)),
                }
            });
            handlers.push(handler);
        }
        Pool::<T>::join_executor_handlers(handlers).await
    }

    pub async fn batch_execute_with_receiver(
        &self,
        mut receiver: MReceiver<T::Command>,
        sender: MSender<T::OkType>,
    ) -> Result<(), PoolError<<T::Command as Command>::CommandDesc, T::ErrorType>> {
        let sender = Arc::new(sender);
        let mut handlers = Vec::new();
        while let Some(command) = receiver.recv().await {
            let desc = command.get_desc();
            let request = self.create_request(command).await;
            let sender = sender.clone();
            let handler: JoinHandle<
                Result<(), PoolExecutorError<<T::Command as Command>::CommandDesc, T::ErrorType>>,
            > = tokio::spawn(async move {
                match request.execute().await {
                    Ok(result) => match sender.send(result).await {
                        Ok(()) => Ok(()),
                        Err(_) => Err(PoolExecutorError::SendError(desc)),
                    },
                    Err(e) => Err(PoolExecutorError::ExecuteError(desc, e)),
                }
            });
            handlers.push(handler);
        }

        Pool::<T>::join_executor_handlers(handlers).await
    }

    #[async_recursion]
    pub async fn create_request(&self, command: T::Command) -> PoolRequest<T> {
        let id = command.get_id();
        info!("{} start get executor for {:?}", self.name, id);
        let executor = self.get_executor().await;
        match executor {
            Some(executor) => {
                info!("{} success get executor for {:?}", self.name, id);
                PoolRequest {
                    pool: self.clone(),
                    command,
                    executor,
                }
            }
            None => {
                info!("{} get not executor for {:?}", self.name, id);
                self.wait_free().await;
                info!("{} retry get executor for {:?}", self.name, id);
                self.create_request(command).await
            }
        }
    }

    async fn get_executor(&self) -> Option<T> {
        let mut executors = self.executors.lock().await;
        executors.pop_front()
    }

    async fn back_executor(&self, executor: T) {
        info!("{} get free executor", self.name);
        let mut executors = self.executors.lock().await;
        executors.push_back(executor);
    }

    async fn wait_free(&self) {
        let (sx, rx) = oneshot::channel();
        let mut waiters = self.waiters.lock().await;
        waiters.push_back(sx);
        drop(waiters);
        rx.await;
    }

    async fn notify_free(&self) {
        info!("{} start notify free", self.name);
        let mut waiters = self.waiters.lock().await;
        if let Some(waiter) = waiters.pop_front() {
            info!("{} notify waiter succeed", self.name);
            waiter.send(());
        } else {
            info!("{} has no waiter", self.name);
        }
    }

    pub fn into_inner(self) -> Result<Vec<T>, Error> {
        match Arc::try_unwrap(self.executors) {
            Ok(executors) => {
                let mut executors = executors.into_inner();
                let executors = executors.into_iter();
                Ok(Vec::from_iter(executors))
            }
            Err(_) => Err(Error::ArcBusy(format!("Pool has job not finish"))),
        }
    }
}
