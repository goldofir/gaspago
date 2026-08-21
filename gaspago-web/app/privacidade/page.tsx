import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Política de Privacidade',
  description: 'Como o Gás Pago coleta, usa e protege dados pessoais, em conformidade com a LGPD.',
}

export default function PoliticaDePrivacidade() {
  return (
    <div className="legal">
      <style>{`
        .legal { min-height: 100vh; background: var(--ground); }

        .legal-header {
          background: var(--navy);
          padding: 48px clamp(20px, 6vw, 72px) 64px;
          position: relative;
        }
        .legal-back {
          display: inline-flex; align-items: center; gap: 7px;
          color: #B9C6D8; font-size: 13.5px; font-weight: 500; text-decoration: none;
        }
        .legal-back:hover { color: #fff; text-decoration: none; }
        .legal-header h1 {
          margin-top: 28px;
          font-family: 'Sora', -apple-system, sans-serif;
          font-size: clamp(1.9rem, 4.6vw, 3rem); font-weight: 800; letter-spacing: -.03em;
          color: #fff; line-height: 1.12;
        }
        .legal-header .updated {
          margin-top: 12px; font-size: 13.5px; color: #8DA0BB;
        }

        .legal-body {
          max-width: 880px; margin: -40px auto 0; padding: 0 clamp(16px, 5vw, 24px) 100px;
        }
        .legal-card {
          background: var(--surface); border: 1px solid var(--border); border-radius: 20px;
          box-shadow: var(--shadow-md);
          padding: clamp(28px, 5vw, 56px);
        }
        .legal-intro {
          font-size: 1rem; color: var(--sub); line-height: 1.75; max-width: 70ch;
          padding-bottom: 28px; margin-bottom: 28px; border-bottom: 1px solid var(--border);
        }
        .legal-toc {
          display: flex; flex-wrap: wrap; gap: 8px 18px;
          padding-bottom: 28px; margin-bottom: 8px; border-bottom: 1px solid var(--border);
        }
        .legal-toc a {
          font-size: 12.5px; color: var(--sub); text-decoration: none;
          background: var(--surface-2); border: 1px solid var(--border);
          padding: 6px 12px; border-radius: 100px;
        }
        .legal-toc a:hover { color: var(--flame); border-color: var(--flame); text-decoration: none; }

        section.clause { padding-top: 36px; }
        section.clause:first-of-type { padding-top: 8px; }
        section.clause h2 {
          font-family: 'Sora', -apple-system, sans-serif;
          font-size: 1.28rem; font-weight: 800; letter-spacing: -.015em; color: var(--text);
          display: flex; align-items: baseline; gap: 10px; scroll-margin-top: 24px;
        }
        section.clause h2 .num {
          font-family: 'JetBrains Mono', monospace; font-size: .85rem; font-weight: 500; color: var(--flame);
        }
        section.clause p, section.clause li {
          max-width: 70ch; font-size: .96rem; line-height: 1.75; color: var(--sub);
        }
        section.clause p { margin-top: 14px; }
        section.clause ul, section.clause ol { margin-top: 14px; padding-left: 22px; display: flex; flex-direction: column; gap: 8px; }
        section.clause strong { color: var(--text); font-weight: 600; }
        section.clause table { margin-top: 18px; width: 100%; border-collapse: collapse; font-size: .89rem; }
        section.clause th, section.clause td { text-align: left; padding: 10px 14px; border: 1px solid var(--border); vertical-align: top; }
        section.clause th { background: var(--surface-2); color: var(--text); font-weight: 600; }
        section.clause td { color: var(--sub); }
        section.clause .table-wrap { overflow-x: auto; margin-top: 18px; }
        section.clause .callout {
          margin-top: 18px; padding: 16px 18px; border-radius: 12px;
          background: var(--flame-dim); border: 1px solid rgba(255,101,36,.25);
          font-size: .92rem; color: #7A3410; line-height: 1.65; max-width: 66ch;
        }
        section.clause .contact-box {
          margin-top: 18px; padding: 20px 22px; border-radius: 14px;
          background: var(--surface-2); border: 1px solid var(--border);
          font-size: .93rem; color: var(--sub); line-height: 1.8; max-width: 60ch;
        }
        section.clause .contact-box strong { display: block; color: var(--text); font-size: .96rem; margin-bottom: 4px; }
        section.clause .contact-box a { color: var(--flame); }

        @media (max-width: 767px) {
          .legal-header { padding: 36px 20px 56px; }
          .legal-body { margin-top: -32px; }
          .legal-card { padding: 24px 18px; border-radius: 16px; }
          .legal-toc { display: none; }
          section.clause table { font-size: .82rem; }
          section.clause th, section.clause td { padding: 8px 10px; }
        }
      `}</style>

      <header className="legal-header">
        <a className="legal-back" href="/">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          Voltar para o início
        </a>
        <h1>Política de Privacidade</h1>
        <p className="updated">Última atualização: 21 de agosto de 2026</p>
      </header>

      <main className="legal-body">
        <div className="legal-card">
          <p className="legal-intro">
            Esta Política de Privacidade descreve como o <strong>Gás Pago</strong> (Gás Pago Tecnologia Ltda.) coleta,
            usa, armazena, compartilha e protege dados pessoais de usuários do aplicativo, do site institucional e dos
            canais de atendimento (incluindo WhatsApp), em conformidade com a Lei Geral de Proteção de Dados Pessoais
            (Lei nº 13.709/2018 — LGPD). Esta política complementa os nossos <a href="/termos">Termos de Uso</a>.
          </p>

          <nav className="legal-toc" aria-label="Sumário">
            <a href="#dados">1. Dados coletados</a>
            <a href="#finalidade">2. Finalidade</a>
            <a href="#compartilhamento">3. Compartilhamento</a>
            <a href="#base-legal">4. Base legal</a>
            <a href="#direitos">5. Direitos do titular</a>
            <a href="#retencao">6. Retenção</a>
            <a href="#seguranca">7. Segurança</a>
            <a href="#cookies">8. Cookies</a>
            <a href="#dpo">9. Encarregado (DPO)</a>
            <a href="#alteracoes">10. Alterações</a>
          </nav>

          <section className="clause" id="dados">
            <h2><span className="num">01</span> Dados coletados</h2>
            <p>Coletamos as seguintes categorias de dados, conforme a sua interação com a plataforma:</p>
            <ul>
              <li><strong>Dados de identificação:</strong> nome completo, número de telefone, e-mail e, quando fornecido, CPF (opcional, utilizado para emissão de nota fiscal e prevenção a fraude).</li>
              <li><strong>Dados de localização e entrega:</strong> CEP, endereço, complemento e, quando autorizado pelo usuário, geolocalização do dispositivo, utilizados para vincular o pedido à distribuidora parceira mais próxima.</li>
              <li><strong>Dados de conta e autenticação:</strong> código OTP (código temporário, não armazenado após validação), identificador de conta Google (quando aplicável) e histórico de acessos.</li>
              <li><strong>Dados de transação:</strong> histórico de pedidos, valores pagos, forma de pagamento utilizada e saldo/movimentações de FGOL.</li>
              <li><strong>Dados de pagamento:</strong> processados diretamente pela <strong>Asaas Gestão Financeira S.A.</strong>, nossa processadora de pagamentos. O Gás Pago <strong>não coleta nem armazena números completos de cartão de crédito/débito</strong> em seus servidores — apenas recebe da Asaas a confirmação e o status da transação.</li>
              <li><strong>Dados da rede de afiliados:</strong> código de indicação utilizado, estrutura de indicados e comissões geradas.</li>
              <li><strong>Dados técnicos:</strong> endereço IP, identificador do dispositivo, modelo/sistema operacional, token de notificação push (Expo) e registros de uso (logs) do aplicativo e do site.</li>
            </ul>
          </section>

          <section className="clause" id="finalidade">
            <h2><span className="num">02</span> Finalidade do tratamento</h2>
            <p>Os dados pessoais coletados são utilizados para as seguintes finalidades:</p>
            <ul>
              <li>Viabilizar a criação e autenticação da conta do usuário;</li>
              <li>Processar, direcionar e acompanhar pedidos junto às distribuidoras parceiras, incluindo cálculo de frete/prazo estimado;</li>
              <li>Processar pagamentos e repasses (split) via Asaas, e emitir comprovantes/notas fiscais;</li>
              <li>Calcular e creditar cashback em FGOL e comissões da rede de afiliados;</li>
              <li>Prevenir, detectar e investigar fraudes, autoindicações artificiais, abuso do programa de cashback e outras violações aos Termos de Uso;</li>
              <li>Enviar comunicações operacionais sobre pedidos, conta e segurança, por WhatsApp, SMS, e-mail e notificações push;</li>
              <li>Enviar comunicações de marketing e campanhas promocionais, quando o usuário tiver consentido a recebê-las, com opção de descadastro a qualquer momento;</li>
              <li>Cumprir obrigações legais e regulatórias, incluindo fiscais e de combate à lavagem de dinheiro.</li>
            </ul>
          </section>

          <section className="clause" id="compartilhamento">
            <h2><span className="num">03</span> Compartilhamento com terceiros</h2>
            <p>
              O Gás Pago não vende dados pessoais a terceiros. Dados são compartilhados apenas na medida necessária à
              prestação do serviço, com os seguintes destinatários:
            </p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Destinatário</th><th>Dados compartilhados</th><th>Finalidade</th></tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Distribuidoras parceiras</td>
                    <td>Nome, telefone, endereço de entrega e itens do pedido</td>
                    <td>Executar a entrega do botijão de gás</td>
                  </tr>
                  <tr>
                    <td>Asaas Gestão Financeira S.A.</td>
                    <td>Nome, CPF (quando informado), dados de contato e valor da transação</td>
                    <td>Processamento de pagamentos, PIX, cartão e repasses</td>
                  </tr>
                  <tr>
                    <td>Provedor de mensageria (WhatsApp / provedor de bot)</td>
                    <td>Telefone e conteúdo necessário ao atendimento do pedido</td>
                    <td>Atendimento, confirmação e suporte via WhatsApp</td>
                  </tr>
                  <tr>
                    <td>Provedores de infraestrutura em nuvem e notificações push</td>
                    <td>Dados de conta e token de dispositivo</td>
                    <td>Hospedagem da plataforma e envio de notificações</td>
                  </tr>
                  <tr>
                    <td>Autoridades públicas</td>
                    <td>Dados requisitados</td>
                    <td>Cumprimento de obrigação legal ou ordem judicial</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              Cada um desses terceiros trata os dados recebidos sob suas próprias políticas de privacidade e apenas para
              a finalidade específica que motivou o compartilhamento, sendo contratualmente vedado o uso dos dados do
              usuário do Gás Pago para finalidades próprias não relacionadas à prestação do serviço.
            </p>
          </section>

          <section className="clause" id="base-legal">
            <h2><span className="num">04</span> Base legal para o tratamento</h2>
            <p>O tratamento de dados pessoais pelo Gás Pago apoia-se nas seguintes bases legais previstas no art. 7º da LGPD:</p>
            <ul>
              <li><strong>Execução de contrato:</strong> dados necessários para processar pedidos, pagamentos, entregas e o programa de cashback/afiliados, como parte da relação contratual com o usuário;</li>
              <li><strong>Consentimento:</strong> para envio de comunicações de marketing, uso de geolocalização precisa e demais tratamentos não essenciais à execução do serviço, sempre revogável pelo usuário;</li>
              <li><strong>Legítimo interesse:</strong> para prevenção a fraudes, segurança da plataforma e melhoria dos serviços, sempre observado o equilíbrio com os direitos e liberdades fundamentais do titular;</li>
              <li><strong>Cumprimento de obrigação legal ou regulatória:</strong> quando aplicável, como retenção de dados fiscais e atendimento a determinações de autoridades competentes.</li>
            </ul>
          </section>

          <section className="clause" id="direitos">
            <h2><span className="num">05</span> Direitos do titular de dados</h2>
            <p>Nos termos do art. 18 da LGPD, o usuário titular dos dados pode, mediante solicitação ao encarregado (cláusula 9), a qualquer momento e gratuitamente:</p>
            <ul>
              <li>Confirmar a existência de tratamento de seus dados pessoais;</li>
              <li>Acessar os dados pessoais tratados pelo Gás Pago;</li>
              <li>Corrigir dados incompletos, inexatos ou desatualizados;</li>
              <li>Solicitar a anonimização, bloqueio ou eliminação de dados desnecessários, excessivos ou tratados em desconformidade com a LGPD;</li>
              <li>Solicitar a portabilidade de dados a outro fornecedor de serviço, mediante requisição expressa;</li>
              <li>Solicitar a eliminação dos dados pessoais tratados com base em consentimento, ressalvadas as hipóteses de retenção legal previstas na cláusula 6;</li>
              <li>Obter informação sobre as entidades públicas e privadas com as quais o Gás Pago compartilhou dados;</li>
              <li>Revogar o consentimento previamente concedido, a qualquer momento;</li>
              <li>Solicitar revisão de decisões tomadas unicamente com base em tratamento automatizado de dados, quando aplicável.</li>
            </ul>
            <p>
              As solicitações serão respondidas em prazo razoável, observados os limites técnicos e legais aplicáveis, e
              podem exigir verificação de identidade do solicitante para garantir a segurança dos dados.
            </p>
          </section>

          <section className="clause" id="retencao">
            <h2><span className="num">06</span> Retenção de dados</h2>
            <p>
              Os dados pessoais são mantidos pelo tempo necessário ao cumprimento das finalidades para as quais foram
              coletados, incluindo o período de vigência da conta do usuário na plataforma. Dados de transações e
              informações fiscais são retidos pelos prazos exigidos pela legislação tributária e civil aplicável
              (em geral, até 5 anos após a transação), mesmo após o eventual encerramento da conta, para fins de
              cumprimento de obrigação legal, exercício regular de direitos em processos judiciais/administrativos e
              prevenção a fraudes. Encerrada a conta e expirados os prazos legais de retenção, os dados são eliminados
              ou anonimizados de forma irreversível.
            </p>
          </section>

          <section className="clause" id="seguranca">
            <h2><span className="num">07</span> Segurança da informação</h2>
            <p>
              O Gás Pago adota medidas técnicas e administrativas para proteger os dados pessoais contra acessos não
              autorizados e situações de destruição, perda, alteração, comunicação ou difusão indevida, incluindo:
            </p>
            <ul>
              <li>Criptografia de credenciais e demais dados sensíveis em trânsito (conexões HTTPS/TLS) e em repouso;</li>
              <li>Controle de acesso baseado em função (RBAC), restringindo o acesso a dados de usuários apenas a colaboradores autorizados e na medida necessária às suas atribuições;</li>
              <li>Autenticação por código de uso único (OTP) e integração segura com provedores de identidade (Google) para acesso à conta;</li>
              <li>Segregação de ambientes e monitoramento de acessos administrativos e transações financeiras;</li>
              <li>Não armazenamento de dados completos de cartão de pagamento, delegados integralmente à Asaas.</li>
            </ul>
            <p>
              Nenhum sistema é absolutamente livre de risco. Na hipótese de incidente de segurança que possa acarretar
              risco ou dano relevante aos titulares, o Gás Pago comunicará o fato à Autoridade Nacional de Proteção de
              Dados (ANPD) e aos titulares afetados, nos termos e prazos previstos na LGPD.
            </p>
          </section>

          <section className="clause" id="cookies">
            <h2><span className="num">08</span> Cookies e tecnologias similares</h2>
            <p>
              O site institucional do Gás Pago utiliza cookies e tecnologias similares estritamente necessários ao seu
              funcionamento (por exemplo, preferências de sessão) e, quando consentido pelo usuário, cookies analíticos
              para compreender o uso do site e melhorar sua experiência. O usuário pode gerenciar ou desativar cookies
              não essenciais diretamente nas configurações de seu navegador; a desativação de cookies essenciais pode
              afetar o funcionamento de partes do site.
            </p>
          </section>

          <section className="clause" id="dpo">
            <h2><span className="num">09</span> Encarregado de dados (DPO)</h2>
            <p>
              Para exercer os direitos previstos na cláusula 5, esclarecer dúvidas sobre esta Política ou reportar
              qualquer preocupação relacionada ao tratamento de dados pessoais, o titular pode entrar em contato com o
              Encarregado de Proteção de Dados (DPO) do Gás Pago:
            </p>
            <div className="contact-box">
              <strong>Encarregado de Proteção de Dados (DPO)</strong>
              E-mail: <a href="mailto:privacidade@gaspago.app">privacidade@gaspago.app</a><br />
              Assunto sugerido: &ldquo;LGPD — Solicitação do Titular&rdquo;
            </div>
          </section>

          <section className="clause" id="alteracoes">
            <h2><span className="num">10</span> Alterações nesta política</h2>
            <p>
              Esta Política de Privacidade pode ser atualizada periodicamente para refletir mudanças em nossas práticas
              de tratamento de dados, em nossos serviços ou na legislação aplicável. Alterações relevantes serão
              comunicadas por aviso no aplicativo, no site institucional ou por e-mail/WhatsApp, com a atualização da
              data no topo desta página. Recomendamos a revisão periódica desta política pelo usuário.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
