type Props = {
  title: string;
  subtitle: string;
};

export default function ModulePlaceholderPage({ title, subtitle }: Props) {
  return (
    <div className="zoho-module-page">
      <div className="zoho-module-header">
        <div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
      </div>

      <section className="zoho-table-wrap">
        <div className="zoho-table-toolbar">
          <span>Módulo en preparación</span>
        </div>
        <div className="zoho-empty">
          Esta vista antigua fue desactivada temporalmente mientras migramos el
          frontend completo al nuevo modelo Zoho.
        </div>
      </section>
    </div>
  );
}