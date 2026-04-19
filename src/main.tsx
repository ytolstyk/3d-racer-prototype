import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@mantine/core/styles.css'
import { MantineProvider, createTheme } from '@mantine/core'
import './index.css'
import App from './App.js'

const theme = createTheme({
  primaryColor: 'yellow',
  colors: {
    yellow: [
      '#fffde7', '#fff9c4', '#fff59d', '#fff176', '#ffee58',
      '#f0c040', '#fdd835', '#f9a825', '#f57f17', '#e65100',
    ],
  },
  fontFamily: 'Nunito, sans-serif',
  headings: { fontFamily: 'Russo One, sans-serif' },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <MantineProvider theme={theme}>
        <App />
      </MantineProvider>
    </BrowserRouter>
  </StrictMode>,
)
