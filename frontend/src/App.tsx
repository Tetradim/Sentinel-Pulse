import { useWebSocket } from './hooks/useWebSocket';
import { Dashboard } from './components/Dashboard';
import { Toaster } from 'sonner';

function App() {
  useWebSocket();

  return (
    <>
      <Dashboard />
      <Toaster
        position="bottom-right"
        theme="dark"
        toastOptions={{
          style: {
            background: '#0a0608',
            border: '1px solid rgba(180,130,10,0.25)',
            color: '#f0e8d0',
            fontFamily: "'Rajdhani', system-ui, sans-serif",
            fontSize: '13px',
          },
        }}
      />
    </>
  );
}

export default App;
