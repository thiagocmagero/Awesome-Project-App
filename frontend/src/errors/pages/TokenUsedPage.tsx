import { useTranslation } from 'react-i18next';
import ErrorLayout from '../components/ErrorLayout';

export default function TokenUsedPage() {
  const { t } = useTranslation('auth');
  return (
    <ErrorLayout
      title={t('error.token_used.title')}
      message={t('error.token_used.message')}
      actionLabel={t('links.back_home')}
      actionHref="/login"
      icon={<i className="ri-checkbox-circle-line text-info" style={{ fontSize: 56 }}></i>}
    />
  );
}
