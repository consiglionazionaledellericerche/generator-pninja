import { useTranslation } from 'react-i18next';
import { useKeycloak } from '@react-keycloak/web';
export default function Err403() {
  const { keycloak } = useKeycloak();
  const { t } = useTranslation();
  return <div className="max-w-[480px] my-4 mx-auto">{t('errors.403')}</div>;
}
