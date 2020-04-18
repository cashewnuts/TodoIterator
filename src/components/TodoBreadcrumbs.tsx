import * as React from 'react'
import {
  FunctionComponent,
} from 'react'
import Breadcrumbs from '@material-ui/core/Breadcrumbs'
import {
  Switch,
  Route,
  Link as RouterLink,
  useRouteMatch,
} from 'react-router-dom'

export interface TodoRecursiveProps {}

const TodoRecursive: FunctionComponent<TodoRecursiveProps> = () => {
  let { url } = useRouteMatch()
  const ids = url
    .split('/')
    .filter(Boolean)
    .map((id, index, array) => {
      const beforeIds = [...array].splice(0, index + 1)
      return {
        id: id,
        href: `/${beforeIds.join('/')}`,
      }
    })
  return (
    <Switch>
      <Route path={`${url}/:todoId`}>
        <TodoRecursive />
      </Route>
      <Route path={`${url}`}>
        <Breadcrumbs>
          {ids &&
            ids.map(({ id, href }) => (
              <RouterLink key={href} to={href}>
                {id}
              </RouterLink>
            ))}
        </Breadcrumbs>
      </Route>
    </Switch>
  )
}

export default TodoRecursive
