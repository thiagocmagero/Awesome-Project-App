// Placeholder partilhado pelas 5 tabs ainda não portadas. Mostra "Em breve".

import { useTranslation } from 'react-i18next';

interface Props {
  tabKey: string;
}

export function ComingSoonTab({ tabKey }: Props) {
  const { t } = useTranslation('planning');
  return (
    <div className="proj-coming-soon">
      <div className="card">
        <h3>{t(`tabs.${tabKey}`)}</h3>
        <p>{t('tabs.coming_soon')}</p>
      </div>
    </div>
  );
}
