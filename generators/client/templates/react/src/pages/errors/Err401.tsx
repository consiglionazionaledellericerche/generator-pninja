import { useTranslation } from 'react-i18next';
import { LoginButton } from '../../components/LoginButton.tsx';
export default function Err401() {
  const { t } = useTranslation();
  return (
    <div className="m-4">
      {t('errors.401')} <LoginButton />
    </div>
  );
}
