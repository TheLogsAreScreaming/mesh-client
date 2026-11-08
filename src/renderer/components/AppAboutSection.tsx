import { useTranslation } from 'react-i18next';

import { MeshHubWordmark } from './MeshHubWordmark';

const COMMUNITY_LINKS = [
  {
    href: 'https://github.com/TheLogsAreScreaming/mesh-client',
    labelKey: 'common.github',
    titleKey: 'app.footerGithubTitle',
  },
] as const;

/**
 * App panel "About" block: the Mesh Hub wordmark, the community tagline and the project link.
 */
export function AppAboutSection() {
  const { t } = useTranslation();
  return (
    <section aria-labelledby="app-about-heading" className="mt-8 space-y-3">
      <h3 id="app-about-heading" className="text-muted text-body-lg font-medium">
        {t('appPanel.aboutSection')}
      </h3>
      <div className="space-y-2">
        <MeshHubWordmark label={t('app.brandName')} />
        <div className="text-body-lg min-w-0">
          <p className="text-muted">
            {t('app.footerSlogan')}{' '}
            <span className="inline-flex flex-wrap gap-x-3">
              {COMMUNITY_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  title={t(link.titleKey)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ink-300 decoration-ink-600 hover:text-ink-100 underline underline-offset-2 transition-colors"
                >
                  {t(link.labelKey)}
                </a>
              ))}
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}
