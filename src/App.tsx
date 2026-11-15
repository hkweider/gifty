import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppProvider } from './store/AppStore';
import { AppShell } from './components/AppShell';
import { HomePage } from './features/home/HomePage';
import { GiftListsPage } from './features/lists/GiftListsPage';
import { ListWorkspace } from './features/lists/ListWorkspace';
import { PeoplePage } from './features/people/PeoplePage';
import { PersonProfilePage } from './features/people/PersonProfilePage';
import { PurchasesPage } from './features/purchases/PurchasesPage';
import { ExplorePage } from './features/explore/ExplorePage';
import { SettingsPage } from './features/settings/SettingsPage';
import { CartPage } from './features/cart/CartPage';
import { SavingsPage } from './features/cart/SavingsPage';

export function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<HomePage />} />
            <Route path="lists" element={<GiftListsPage />} />
            <Route path="lists/:occasionId/:personId" element={<ListWorkspace />} />
            <Route path="lists/:occasionId/:personId/:tab" element={<ListWorkspace />} />
            <Route path="people" element={<PeoplePage />} />
            <Route path="people/:personId" element={<PersonProfilePage />} />
            <Route path="purchases" element={<PurchasesPage />} />
            <Route path="explore" element={<ExplorePage />} />
            <Route path="cart" element={<CartPage />} />
            <Route path="cart/saved" element={<CartPage saved />} />
            <Route path="cart/savings" element={<SavingsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
