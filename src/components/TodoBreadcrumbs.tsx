import React, { useEffect, useState, PropsWithChildren } from 'react'
import Breadcrumbs from '@material-ui/core/Breadcrumbs'
import {
  Switch,
  Route,
  Link as RouterLink,
  useRouteMatch,
} from 'react-router-dom'
import { db } from '../services/local-db'

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface TodoRecursiveProps {}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const TodoBreadcrumbs = (props: PropsWithChildren<TodoRecursiveProps>) => {
  const { url } = useRouteMatch()
  const [breads, setBreads] = useState<{ id: string; href: string }[]>([])
  useEffect(() => {
    const asyncFn = async () => {
      const paths = url.split('/').filter(Boolean)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const [__, ...pathTails] = paths
      const _breads = await Promise.all(
        pathTails.map(async (id, index, array) => {
          const beforeIds = [...array]
            .splice(0, index + 1)
            .map((bId) => bId.substring(0, 7))
          return {
            id: (await db.tasks.where('id').startsWith(id).first())?.name || '',
            href: `/nest/${beforeIds.join('/')}`,
          }
        })
      )
      _breads.unshift({
        id: 'Top Page',
        href: '/',
      })
      setBreads(_breads)
    }
    asyncFn()
  }, [url])
  return (
    <Switch>
      <Route path={`${url}/:todoId`}>
        <TodoBreadcrumbs />
      </Route>
      <Route path={`${url}`}>
        <Breadcrumbs>
          {breads.map(({ id, href }) => (
            <RouterLink key={href} to={href}>
              {id}
            </RouterLink>
          ))}
        </Breadcrumbs>
      </Route>
    </Switch>
  )
}

export default TodoBreadcrumbs
