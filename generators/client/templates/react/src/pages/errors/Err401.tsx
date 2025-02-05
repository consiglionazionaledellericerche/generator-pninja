import { useTranslation } from 'react-i18next';
export default function Err401() {
  const { t } = useTranslation();
  return <div className="max-w-[480px] my-4 mx-auto">{t('errors.401')}</div>;
}
