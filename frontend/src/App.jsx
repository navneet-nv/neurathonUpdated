import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { EventProvider } from './EventContext'
import Layout from './Layout'
import EventsPage from './pages/EventsPage'
import Dashboard from './pages/Dashboard'
import SetupPage from './pages/SetupPage'
import ContentPage from './pages/ContentPage'
import EmailPage from './pages/EmailPage'
import SchedulerPage from './pages/SchedulerPage'
import SwarmPage from './pages/SwarmPage'
import QAPage from './pages/QAPage'

function App() {
  return (
    <EventProvider>
      <BrowserRouter>
        <Toaster 
          position="bottom-right" 
          toastOptions={{
            style: {
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
              fontSize: '13px',
              borderRadius: '12px'
            }
          }} 
        />
        <Layout>
          <Routes>
            <Route path="/events" element={<EventsPage />} />
            <Route path="/" element={<Dashboard />} />
            <Route path="/setup" element={<SetupPage />} />
            <Route path="/content" element={<ContentPage />} />
            <Route path="/email" element={<EmailPage />} />
            <Route path="/scheduler" element={<SchedulerPage />} />
            <Route path="/swarm" element={<SwarmPage />} />
            <Route path="/qa" element={<QAPage />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </EventProvider>
  )
}

export default App

