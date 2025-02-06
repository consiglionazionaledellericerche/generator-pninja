import { useTranslation } from 'react-i18next';
export default function Err403() {
  const { t } = useTranslation();
  return <div className="m-4">{t('errors.403')}</div>;
}
