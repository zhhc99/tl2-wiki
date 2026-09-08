import { Links, Meta, Outlet, Scripts, ScrollRestoration, useMatches } from 'react-router'
import './styles.css'

export function Layout({ children }: { children: React.ReactNode }) {
  const data = useMatches().at(-1)?.data as { lang?: string } | undefined
  return (
    <html lang={data?.lang === 'en' ? 'en-US' : (data?.lang ?? 'en-US')}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#262d29" />
        <link rel="icon" href={`${import.meta.env.BASE_URL}favicon.ico`} sizes="any" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

export default function Root() {
  return <Outlet />
}
