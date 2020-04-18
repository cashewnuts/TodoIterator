import * as React from 'react'
import { useState, FormEvent } from 'react'
import DeleteIcon from '@material-ui/icons/Delete'
import EditIcon from '@material-ui/icons/Edit'
import ClearIcon from '@material-ui/icons/Clear'
import TextField from '@material-ui/core/TextField'
import Box from '@material-ui/core/Box'
import {
  ListItem,
  ListItemIcon,
  Checkbox,
  ListItemText,
  IconButton,
  ListItemSecondaryAction,
} from '@material-ui/core'
import { SyntheticEvent } from 'react'
import { ITask } from '../models/task'

export interface TodoListItemProps {
  todo: ITask
  disableCheckbox?: boolean
  onListClick: (event: SyntheticEvent<HTMLElement>) => void
  onToggle: (event: SyntheticEvent<HTMLButtonElement>) => void
  onDelete: (event: SyntheticEvent<HTMLButtonElement>) => void
  onChangeName: (value: string) => void
}
export default (props: TodoListItemProps) => {
  const {
    todo,
    disableCheckbox = false,
    onListClick,
    onToggle,
    onDelete,
    onChangeName,
  } = props
  const [todoName, setTodoName] = useState(todo.name)
  const [editing, setEditing] = useState(false)
  const handleTodoNameChange = (name: string) => {
    onChangeName(name)
    setEditing(false)
  }
  const handleChangeButtonClick = () => {
    setEditing(true)
  }
  const handleEditSumit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    handleTodoNameChange(todoName)
  }
  return (
    <ListItem
      role="list"
      button
      onClick={!editing ? onListClick : undefined}
      style={{ paddingRight: '86px' }}
    >
      <ListItemIcon
        onTouchStart={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <Checkbox
          edge="start"
          checked={todo.isDone}
          tabIndex={-1}
          disabled={disableCheckbox}
          disableFocusRipple={editing}
          disableRipple={editing}
          disableTouchRipple={editing}
          inputProps={{ 'aria-labelledby': todo.name }}
          onClick={onToggle}
        />
      </ListItemIcon>
      {!editing && <ListItemText primary={todo.name} />}
      {editing && (
        <Box style={{ width: 'inherit' }} onClick={(e) => e.stopPropagation()}>
          <form onSubmit={handleEditSumit}>
            <TextField
              fullWidth
              value={todoName}
              onChange={(e) => setTodoName(e.target.value)}
              onBlur={() => handleTodoNameChange(todoName)}
            />
          </form>
        </Box>
      )}
      <ListItemSecondaryAction>
        {!editing && (
          <IconButton
            edge="end"
            aria-label="comments"
            onClick={handleChangeButtonClick}
          >
            <EditIcon />
          </IconButton>
        )}
        {editing && (
          <IconButton
            edge="end"
            aria-label="comments"
            onClick={() => setEditing(false)}
          >
            <ClearIcon />
          </IconButton>
        )}
        <IconButton edge="end" aria-label="comments" onClick={onDelete}>
          <DeleteIcon />
        </IconButton>
      </ListItemSecondaryAction>
    </ListItem>
  )
}
