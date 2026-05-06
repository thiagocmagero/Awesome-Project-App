import { useTranslation } from 'react-i18next';
import ErrorLayout from '../components/ErrorLayout';

export default function TokenExpiredPage() {
  const { t } = useTranslation('auth');
  return (
    <ErrorLayout
      title={t('error.token_expired.title')}
      message={t('error.token_expired.message')}
      actionLabel={t('links.back_home')}
      actionHref="/login"
      icon={<i className="ri-time-line text-warning" style={{ fontSize: 56 }}></i>}
    />
  );
}
