import * as React from 'react'
import {
  useEffect,
  useState,
  SyntheticEvent,
  ChangeEvent,
  FocusEvent,
  FunctionComponent,
} from 'react'
import Button from '@material-ui/core/Button'
import DoneIcon from '@material-ui/icons/Done'
import CheckCircleOutlineIcon from '@material-ui/icons/CheckCircleOutline'

import { useHistory, useRouteMatch } from 'react-router-dom'
import TodoBreadcrumbs from '../components/TodoBreadcrumbs'
import TodoListItem from '../components/TodoListItem'
import ConfirmDialog from '../components/ConfirmDialog'
import Task, { ITask } from '../models/task'
import { db } from '../services/local-db'
import Container from '@material-ui/core/Container'
import Box from '@material-ui/core/Box'
import List from '@material-ui/core/List'
import TextField from '@material-ui/core/TextField'
import { createLogger } from '../services/logger'
const logger = createLogger({ filename: 'TodoAppChild.tsx' })

export interface TodoAppChildProps {
  todoId: string
}

const TodoAppChild: FunctionComponent<TodoAppChildProps> = (props) => {
  const { todoId } = props
  let { url } = useRouteMatch()
  const [todoList, setTodoList] = useState<Task[]>([])
  const [rootTask, setRootTask] = useState<Task>()
  const [rootTaskDone, setRootTaskDone] = useState<boolean>(false)
  const [todoName, setTodoName] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [viewState, setViewState] = useState<{
    descriptionOpen: boolean
    disableCheckbox: boolean
  }>({
    descriptionOpen: false,
    disableCheckbox: true,
  })
  const [deleteDialogParams, setDeleteDialogParams] = useState<{
    id: string
  } | null>(null)
  let history = useHistory()

  useEffect(() => {
    const asyncInitFn = async () => {
      try {
        if (!todoId) throw new Error('todoId not found')
        const rootTask = await db.tasks.get(todoId)
        if (rootTask instanceof Task) {
          setRootTask(rootTask)
          setRootTaskDone(rootTask.isDone)
          setDescription(rootTask.description)
          const tasks = await db.tasks
            .where('id')
            .anyOf(rootTask.children)
            .toArray()
          setTodoList(tasks.map((t) => (t instanceof Task ? t : new Task(t))))
          const isAllChecked = tasks.every((task) => task.isDone)
          setViewState((v) => ({
            ...v,
            disableCheckbox: !isAllChecked,
          }))
        } else {
          throw new Error('rootTask not found.')
        }
      } catch (err) {
        logger.error(`Error: ${err.message}`, err.stack)
        history.goBack()
        setTimeout(() => {
          history.push('/')
        }, 3000)
      }
    }
    asyncInitFn()
    return () => {}
  }, [todoId, history])

  const handleItemClick = (value: any) => (event: any) => {
    history.push(`${url}/${value}`)
  }
  const handleTodoNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target
    setTodoName(value)
  }
  const handleToggleRootTask = (event: SyntheticEvent<HTMLButtonElement>) => {
    if (!rootTask) return
    rootTask.isDone = !rootTask.isDone
    rootTask.save()
    setRootTaskDone(rootTask.isDone)
  }
  const handleAddTodo = async (event: SyntheticEvent<HTMLFormElement>) => {
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
      setViewState({
        ...viewState,
        disableCheckbox: true,
      })
      setRootTaskDone(false)
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
    if (!rootTask) throw new Error('root task not exists')
    if (!deleteDialogParams) throw new Error('deleting task not exists')
    setDeleteDialogParams(null)
    const taskId = deleteDialogParams.id
    rootTask.removeChildren(taskId)
    const filteredTodoList = todoList.filter((t) => t.id !== taskId)
    setTodoList(filteredTodoList)
    const isAllChecked = filteredTodoList.every((task) => task.isDone)
    setViewState((v) => ({
      ...v,
      disableCheckbox: !isAllChecked,
    }))
  }
  const handleChangeNameTodo = (taskId: string) => async (name: string) => {
    const todo = todoList.find((todo) => todo.id === taskId)
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
    const isAllChecked = todoList.every((task) => task.isDone)
    setViewState((v) => ({
      ...v,
      disableCheckbox: !isAllChecked,
    }))
    setTimeout(() => setTodoList([...todoList]), 200)
  }
  const handleDescriptionBlur = (event: FocusEvent<HTMLInputElement>) => {
    event.stopPropagation()
    if (!rootTask) throw new Error('root task not exists')
    rootTask.description = description
    rootTask.save()
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
        <TodoBreadcrumbs />
        <Box>{rootTask && <h1>{rootTask.name}</h1>}</Box>
        <Box p={1}>
          <Container>
            <TextField
              id="outlined-multiline-static"
              label="Description"
              multiline
              fullWidth
              rows="4"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleDescriptionBlur}
              variant="outlined"
            />
          </Container>
        </Box>
        <Box pt={2}>
          {rootTaskDone && (
            <Button
              variant="contained"
              color="secondary"
              disabled={viewState.disableCheckbox}
              onClick={handleToggleRootTask}
              startIcon={<DoneIcon />}
            >
              Undone
            </Button>
          )}
          {!rootTaskDone && (
            <Button
              variant="contained"
              color="primary"
              disabled={viewState.disableCheckbox}
              onClick={handleToggleRootTask}
              startIcon={<CheckCircleOutlineIcon />}
            >
              Make Complete
            </Button>
          )}
        </Box>
        <Box>
          <List>
            {todoList &&
              todoList.map((todo: ITask) => (
                <TodoListItem
                  key={`${todo.id} ${todo.isDone} ${todo.children}`}
                  todo={todo}
                  disableCheckbox={rootTaskDone}
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
              onChange={handleTodoNameChange}
            />
          </form>
        </Box>
      </Container>
    </div>
  )
}

export default TodoAppChild
