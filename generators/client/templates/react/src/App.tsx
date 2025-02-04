import { Routes, Route } from 'react-router-dom';
import { useKeycloak } from '@react-keycloak/web';
import './App.css';
import Menu from './Menu';
import Home from './pages/Home';
import Login from './pages/Login';
import Err401 from './pages/Err401';
import Err403 from './pages/Err403';
// import keycloak from './keycloak';
function App() {
  const { keycloak, initialized } = useKeycloak();
  if (!initialized) {
    return <div>Loading...</div>;
  }

  // if (!keycloak.authenticated) {
  //   keycloak.login();
  //   return <div>Redirecting to login...</div>;
  // }

  const isAdmin = keycloak.hasResourceRole('axdmin');
  return (
    <>
      <Menu />
      <Routes>
        <Route path="/" element={keycloak.authenticated ? <Home /> : <Login />} />
        <Route
          path="/admin"
          element={keycloak.authenticated ? isAdmin ? <Home /> : <Err403 /> : <Err401 />}
        />
      </Routes>
      {keycloak.authenticated && (
        <pre className="whitespace-pre bg-slate-800 text-lime-300 p-4 rounded-md m-4">
          email = {keycloak.tokenParsed?.email}
          <br />
          login = {keycloak.tokenParsed?.preferred_username}
          <br />
          name = {keycloak.tokenParsed?.name}
          <br />
          isAdmin = {isAdmin ? 'T' : 'F'}
        </pre>
      )}
    </>
  );
}

export default App;
