import { useTranslation } from 'react-i18next';
export default function Err404() {
  const { t } = useTranslation();
  return <div className="m-4">{t('errors.404')}</div>;
}
