import React, { PropsWithChildren } from 'react'
import { Switch, Route, useParams, useRouteMatch } from 'react-router-dom'
import TodoAppChild from './TodoAppChild'

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface TodoRecursiveProps {}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const TodoRecursive = (props: PropsWithChildren<TodoRecursiveProps>) => {
  const { url } = useRouteMatch()
  const { todoId = '' } = useParams()
  return (
    <Switch>
      <Route path={`${url}/:todoId`}>
        <TodoRecursive />
      </Route>
      <Route path={'/nest/*'}>
        <TodoAppChild todoId={todoId} />
      </Route>
    </Switch>
  )
}

export default TodoRecursive
