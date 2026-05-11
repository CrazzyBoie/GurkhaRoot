import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { Toaster } from 'sonner';

export function Layout() {
  return (
    <div className="min-h-screen bg-[#f5f5f0]">
      <Navbar />
      <main className="pt-16 lg:pt-20">
        <Outlet />
      </main>
      <Footer />
      <Toaster 
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#1a1a1a',
            color: '#f5f5f0',
            border: '1px solid #333',
          },
        }}
      />
    </div>
  );
}