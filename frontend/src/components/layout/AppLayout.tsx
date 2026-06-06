import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

/** Coquille de l'application connectée : sidebar fixe + topbar + contenu de page. */
export default function AppLayout() {
  return (
    <div className="grid min-h-screen grid-cols-[240px_1fr]">
      <Sidebar />
      <div className="flex min-w-0 flex-col">
        <Topbar />
        <main className="flex-1 px-8 py-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
