import * as React from 'react'
import { FunctionComponent } from 'react'
import { Switch, Route, useParams, useRouteMatch } from 'react-router-dom'
import TodoAppChild from './TodoAppChild'

export interface TodoRecursiveProps {}

const TodoRecursive: FunctionComponent<TodoRecursiveProps> = (props) => {
  const { url } = useRouteMatch()
  const { todoId = '' } = useParams()
  return (
    <Switch>
      <Route path={`${url}/:todoId`}>
        <TodoRecursive />
      </Route>
      <Route path={`${url}`}>
        <TodoAppChild todoId={todoId} />
      </Route>
    </Switch>
  )
}

export default TodoRecursive
