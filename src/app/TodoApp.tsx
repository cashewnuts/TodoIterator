import * as React from 'react'
import {
  useEffect,
  useState,
  SyntheticEvent,
  ChangeEvent,
  FunctionComponent,
  useContext,
} from 'react'
import Box from '@material-ui/core/Box'
import List from '@material-ui/core/List'
import TextField from '@material-ui/core/TextField'
import Container from '@material-ui/core/Container'
import TodoListItem from '../components/TodoListItem'
import ConfirmDialog from '../components/ConfirmDialog'
import Task, { TASK_ROOT_ID, ITask } from '../models/task'
import { db } from '../services/local-db'
import { useHistory } from 'react-router-dom'
import { createLogger } from '../services/logger'
import EventContext from '../contexts/event-context'
import { INITIATED } from '../constants/store-event'
const logger = createLogger({ filename: 'TodoApp.tsx' })

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface TodoAppProps {}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const TodoApp: FunctionComponent<TodoAppProps> = (props) => {
  const { storeEvent } = useContext(EventContext)
  const [todoName, setTodoName] = useState<string>('')
  const [todoList, setTodoList] = useState<Task[]>([])
  const [rootTask, setRootTask] = useState<Task>()
  const [deleteDialogParams, setDeleteDialogParams] = useState<{
    id: string
  } | null>(null)
  const history = useHistory()

  useEffect(() => {
    const asyncFn = async () => {
      logger.debug('initial asyncFn')
      try {
        const rootTask = await db.tasks.get(TASK_ROOT_ID)
        if (rootTask instanceof Task) {
          await rootTask.repareChildren()
          setRootTask(rootTask)
          const tasks = await db.tasks
            .where('id')
            .anyOf(rootTask.children)
            .toArray()
          const _todoList = tasks.map((t) =>
            t instanceof Task ? t : new Task(t)
          )
          logger.debug('setTodoList', _todoList)
          setTodoList(_todoList)
        } else {
          const rootTask = new Task({
            id: TASK_ROOT_ID,
            name: 'root',
            description: 'root task',
            children: [],
            isDone: false,
          })
          rootTask.save()
          setRootTask(rootTask)
        }
      } catch (err) {
        logger.error('initial asyncFn', err.message, err.stack, err)
      }
    }
    storeEvent.on(INITIATED, asyncFn)
    asyncFn()
  }, [storeEvent])

  const handleItemClick = (value: any) => (event: any) => {
    history.push(`/nest/${value.substring(0, 7)}`)
  }
  const handleAddingTodoNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target
    logger.debug(`Changing new todo name: ${value}`)
    setTodoName(value)
  }
  const handleAddTodo = async (event: SyntheticEvent<HTMLFormElement>) => {
    logger.debug(`Added todo: ${todoName}`)
    event.preventDefault()
    if (!rootTask) throw new Error('root task not exists')
    const task = new Task({
      name: todoName,
      description: '',
      children: [],
      isDone: false,
    })
    try {
      await task.save()
      rootTask.isDone = false
      await rootTask.saveChildren(task)
      setTodoList([...todoList, task])
      setTodoName('')
    } catch (err) {
      logger.error(`Error: ${err.message}`, err.stack)
    }
  }
  const handleDeleteConfrim = (taskId: string) => (
    event: SyntheticEvent<HTMLButtonElement>
  ) => {
    event.stopPropagation()
    if (!rootTask) throw new Error('root task not exists')
    setDeleteDialogParams({ id: taskId })
  }
  const handleDeleteTodo = () => {
    logger.debug(`Delete todo: ${deleteDialogParams?.id}`)
    if (!rootTask) throw new Error('root task not exists')
    if (!deleteDialogParams) throw new Error('deleting task not exists')
    setDeleteDialogParams(null)
    const taskId = deleteDialogParams.id
    rootTask.removeChildren(taskId)
    setTodoList(todoList.filter((t) => t.id !== taskId))
  }
  const handleChangeNameTodo = (taskId: string) => async (name: string) => {
    const todo = todoList.find((todo) => todo.id === taskId)
    logger.debug(`Changed todo name: from ${todo?.name} to ${name}`)
    if (!todo) {
      return
    }
    todo.name = name
    todo.save()
    setTodoList([...todoList])
  }
  const handleToggleTodo = (taskId: string) => (
    event: SyntheticEvent<HTMLButtonElement>
  ) => {
    event.stopPropagation()
    event.preventDefault()
    const index = todoList.findIndex((t) => t.id === taskId)
    const task = todoList[index]
    if (!task) return
    task.isDone = !task.isDone
    task.update()
    setTimeout(() => setTodoList([...todoList]), 200)
  }
  return (
    <div role="application">
      <ConfirmDialog
        title="Delete Confirmation"
        content="Is it Ok to delete?"
        open={!!deleteDialogParams}
        onCancel={() => setDeleteDialogParams(null)}
        onOk={handleDeleteTodo}
      />
      <Container>
        <Box>
          <h1>Create your task</h1>
        </Box>
        <Box>
          <List>
            {todoList &&
              todoList.map((todo: ITask) => (
                <TodoListItem
                  key={`${todo.id} ${todo.isDone} ${todo.children}`}
                  todo={todo}
                  onListClick={handleItemClick(todo.id)}
                  onToggle={handleToggleTodo(todo.id as string)}
                  onDelete={handleDeleteConfrim(todo.id as string)}
                  onChangeName={handleChangeNameTodo(todo.id as string)}
                />
              ))}
          </List>
          <form onSubmit={handleAddTodo}>
            <TextField
              name="todo-name"
              label="Add Your Todo"
              value={todoName}
              onChange={handleAddingTodoNameChange}
            />
          </form>
        </Box>
      </Container>
    </div>
  )
}

export default TodoApp
