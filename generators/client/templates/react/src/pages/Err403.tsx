import { useKeycloak } from '@react-keycloak/web';
export default function Err403() {
  const { keycloak } = useKeycloak();
  return (
    <div>
      <div className="max-w-[480px] my-4 mx-auto">
        L'utente <strong>{keycloak.tokenParsed?.preferred_username}</strong> non è autorizzato ad
        accedere a questa risorsa
      </div>
    </div>
  );
}
