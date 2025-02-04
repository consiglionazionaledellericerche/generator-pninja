import { useKeycloak } from '@react-keycloak/web';
export default function Login() {
  const { keycloak, initialized } = useKeycloak();
  if (!initialized) {
    return <div>Loading...</div>;
  }

  if (!keycloak.authenticated) {
    keycloak.login();
    return <div>Redirecting to login...</div>;
  }

  return <></>;
}
