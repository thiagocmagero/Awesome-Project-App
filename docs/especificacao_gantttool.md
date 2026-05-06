# Especificação inicial da funcionalidade GanttTool

## 1. Objetivo

Pretende-se analisar a ferramenta de Gantt atualmente utilizada dentro dos projetos, com o objetivo de realizar um brainstorm técnico e funcional que permita, numa fase posterior, definir um plano de implementação para uma nova funcionalidade chamada **GanttTool**.

A **GanttTool** deverá replicar com elevada fidelidade a ferramenta de Gantt já existente nos projetos, preservando o comportamento visual, as interações principais, a experiência de utilização e as funcionalidades essenciais já implementadas.

No entanto, esta nova ferramenta deverá funcionar de forma isolada da estrutura de projetos existente. Ou seja, não deverá obrigar à criação de um projeto formal, convite de utilizadores, associação a permissões complexas de projeto ou qualquer outro fluxo pesado da aplicação.

A ideia é disponibilizar uma ferramenta ágil para planeamentos rápidos, permitindo ao utilizador criar e gerir planeamentos de forma simples, prática e independente.

## 2. Conceito da GanttTool

A **GanttTool** será uma ferramenta autónoma de planeamento visual baseada em Gantt.

Esta ferramenta deve permitir que o utilizador logado crie múltiplos planeamentos independentes, cada um com a sua própria estrutura de atividades, recursos e configurações.

A **GanttTool** deve ser pensada para cenários em que o utilizador precisa de criar rapidamente um cronograma, organizar project, tasks, subtasks, milestones, dependências e recursos, sem ter de criar um projeto completo na aplicação.

Exemplo de uso esperado:

Um utilizador precisa estruturar rapidamente um planeamento para uma iniciativa, estimar prazos, criar tasks, subtasks e milestones, definir dependências, criar recursos e visualizar tudo num Gantt. Para isso, não deve ser necessário criar um projeto formal, convidar utilizadores, configurar permissões ou ativar funcionalidades adicionais da gestão completa de projetos.

## 3. Separação face ao Gantt de projetos

O Gantt atualmente existente está associado ao contexto de projetos e depende da estrutura completa da aplicação, incluindo projetos, participantes, permissões, tarefas do projeto, milestones, recursos do projeto e regras específicas de colaboração.

A **GanttTool** deverá ser independente desse contexto.

A nova ferramenta não deverá alterar o comportamento atual do Gantt existente dentro dos projetos. Toda a lógica nova deve ser criada de forma separada, evitando impactos nas funcionalidades já existentes.

A **GanttTool** deve reutilizar, sempre que fizer sentido, a experiência visual, os padrões de interação e os componentes do Gantt atual, mas sem herdar a complexidade operacional associada aos projetos.

## 4. Regra de nomenclatura

Todos os novos elementos criados especificamente para esta funcionalidade devem referenciar explicitamente **Gantt** na nomenclatura.

Não deve ser utilizado apenas o sufixo genérico **Tool** sem a palavra **Gantt**.

A nomenclatura deve deixar claro que os elementos pertencem à funcionalidade **GanttTool**.

Exemplos esperados:

- GanttToolPlan
- GanttToolProject
- GanttToolTask
- GanttToolSubtask
- GanttToolMilestone
- GanttToolDependency
- GanttToolResourceType
- GanttToolResource
- GanttToolResources
- GanttToolSettings
- GanttToolController
- GanttToolService
- GanttToolRepository
- GanttToolEndpoints

Sempre que forem criadas novas entidades, DTOs, componentes, serviços, endpoints, permissões, chaves técnicas ou estruturas auxiliares, a nomenclatura deve seguir esta regra.

## 5. Feature flag e acesso pelo menu

A nova funcionalidade deverá ser controlada por uma feature flag para planos:

```text
gantttool_view
```

A **GanttTool** só deverá estar disponível para utilizadores cujo plano tenha acesso a esta feature flag.

Caso a feature flag `gantttool_view` esteja ativa no plano do utilizador, a funcionalidade deverá aparecer no menu lateral da aplicação no seguinte caminho:

```text
Tool > Gantt
```

A feature flag deve controlar, pelo menos:

- A visibilidade da entrada de menu **Tool > Gantt**.
- O acesso à página principal da GanttTool.
- O acesso aos endpoints relacionados com a GanttTool.
- A possibilidade de criar, editar, visualizar e remover planeamentos da GanttTool.

Caso a feature flag esteja desativada para o utilizador, a funcionalidade não deve aparecer na interface e o acesso direto por URL ou API deve ser bloqueado.

## 6. Utilizador e acesso aos planeamentos

A **GanttTool** é uma ferramenta individual do utilizador logado na plataforma.

Cada planeamento criado na **GanttTool** pertence exclusivamente ao utilizador que o criou.

Não existe e não deverá existir conceito de colaboradores, participantes, membros convidados, permissões por projeto ou partilha de planeamentos com outros utilizadores.

Todos os dados criados dentro de um planeamento da **GanttTool** devem estar associados ao utilizador dono do planeamento.

Isto inclui:

- Planeamentos.
- Project.
- Tasks.
- Subtasks.
- Milestones.
- Dependências.
- Tipos de recursos.
- Recursos.
- Configurações do planeamento.

O utilizador logado deve ser o único com acesso aos seus planeamentos da **GanttTool**.

Todos os recursos utilizados nos planeamentos da **GanttTool** são criados, editados e geridos pelo próprio utilizador. Não devem existir recursos partilhados entre utilizadores.

## 7. Funcionalidades principais

A **GanttTool** deverá permitir a criação e gestão de múltiplos planeamentos independentes.

Como a **GanttTool** deverá replicar a ferramenta de Gantt já existente nos projetos, devem ser consideradas as entidades e conceitos principais do Gantt atual, incluindo project, tasks, subtasks, milestones, dependências, tipos de recursos e recursos.

Cada planeamento da **GanttTool** poderá conter:

- Project ou estrutura equivalente do Gantt atual.
- Tasks.
- Subtasks.
- Milestones.
- Dependências entre atividades.
- Datas de início e fim.
- Duração.
- Progresso.
- Tipos de recursos.
- Recursos.
- Atribuição de recursos a tasks, subtasks ou milestones, conforme a lógica suportada pelo Gantt atual.
- Configurações próprias do planeamento.

Tasks, subtasks e milestones devem fazer parte da mesma estrutura de planeamento, respeitando o modelo hierárquico e funcional do Gantt atual.

Uma subtask deve estar sempre associada a uma task parent ou a outro modelo hierárquico equivalente, conforme a lógica do Gantt atual.

O conceito de project deve existir apenas como estrutura técnica ou funcional interna da **GanttTool**, necessária para replicar o comportamento do Gantt, e não como um projeto formal da aplicação.

## 8. Contadores e limites por plano

A **GanttTool** deve possuir contadores para controlo de limites associados aos planos da aplicação.

Devem ser contabilizados, no mínimo, os seguintes indicadores:

### 8.1. Quantidade de planeamentos

Deve existir um contador para a quantidade total de planeamentos da **GanttTool** criados pelo utilizador.

Este contador será utilizado para validar limites do plano do utilizador.

Exemplo de nomenclatura possível:

- GanttToolPlansCount
- GanttToolPlanLimit

### 8.2. Quantidade de tasks por planeamento

Deve existir um contador para a quantidade de tasks dentro de cada planeamento da **GanttTool**.

Para este limite, **tasks e subtasks devem contar para o mesmo total**.

Ou seja, se um planeamento tiver 5 tasks principais e 10 subtasks, o total contabilizado para o limite será 15.

Milestones devem ser avaliadas durante a análise para confirmar se entram no mesmo contador de tasks ou se necessitam de um contador próprio, conforme o modelo de limites definido para os planos da aplicação.

Exemplo de nomenclatura possível:

- GanttToolTasksCount
- GanttToolTaskLimit

### 8.3. Quantidade de recursos por planeamento

Deve existir um contador para a quantidade de recursos criados dentro de cada planeamento da **GanttTool**.

Os recursos são específicos do planeamento ou do contexto do utilizador, conforme a modelação que vier a ser definida, mas devem estar sempre sob gestão do utilizador dono do planeamento.

Exemplo de nomenclatura possível:

- GanttToolResourcesCount
- GanttToolResourceLimit

## 9. Regras de planos e limites

A **GanttTool** deve respeitar os limites definidos nos planos da aplicação.

A análise deve prever como estes limites serão configurados, consultados e aplicados.

Devem ser considerados, pelo menos, os seguintes limites:

- Número máximo de planeamentos da GanttTool por utilizador.
- Número máximo de tasks e subtasks por planeamento.
- Número máximo de recursos por planeamento.

Deve ser avaliado se milestones entram no limite de tasks ou se terão um limite próprio.

Quando o utilizador atingir um limite, a interface deve impedir a criação de novos elementos acima do limite permitido e apresentar uma mensagem clara.

As validações de limite devem existir tanto no frontend como no backend, garantindo que o utilizador não consegue ultrapassar os limites através de chamadas diretas à API.

## 10. i18n e namespaces de tradução

A **GanttTool** pode reutilizar o namespace de traduções já existente do Gantt sempre que forem textos, labels, mensagens ou opções comuns à ferramenta atual.

No entanto, qualquer texto novo, alteração de comportamento, mensagem específica, label exclusiva ou necessidade de diferenciação da nova ferramenta deve utilizar um namespace específico para a **GanttTool**.

Deve ser criado ou utilizado um namespace específico, por exemplo:

```text
gantttool
```

Exemplos de chaves específicas:

```text
gantttool.title
gantttool.menu.label
gantttool.plan.create
gantttool.plan.edit
gantttool.plan.delete
gantttool.plan.limitReached
gantttool.task.limitReached
gantttool.resource.limitReached
gantttool.emptyState.title
gantttool.emptyState.description
```

Regra geral:

- Textos já existentes e iguais aos do Gantt atual podem reutilizar o namespace do Gantt.
- Textos novos ou específicos da GanttTool devem usar o namespace `gantttool`.
- Alterações em textos existentes não devem afetar o Gantt dos projetos.
- Quando houver dúvida entre reutilizar ou criar uma nova chave, deve-se criar uma chave específica no namespace `gantttool` para evitar impactos no Gantt existente.

## 11. Princípios da funcionalidade

A implementação da **GanttTool** deve seguir os seguintes princípios:

- Ser simples e rápida de utilizar.
- Estar isolada da estrutura de projetos.
- Não exigir criação de projeto formal da aplicação.
- Não exigir convite de utilizadores.
- Não possuir colaboradores.
- Não permitir partilha de planeamentos entre utilizadores.
- Pertencer apenas ao utilizador logado.
- Permitir múltiplos planeamentos por utilizador.
- Permitir criação prática de project, tasks, subtasks, milestones, tipos de recursos e recursos no contexto da GanttTool.
- Reutilizar a experiência visual e funcional do Gantt atual sempre que fizer sentido.
- Manter separação técnica clara através de nomenclaturas com **GanttTool**.
- Respeitar a feature flag `gantttool_view`.
- Apresentar a funcionalidade no menu lateral em **Tool > Gantt** quando a feature flag estiver ativa no plano do utilizador.
- Respeitar os limites do plano do utilizador.
- Não alterar o comportamento atual do Gantt existente nos projetos.
- Permitir evolução futura apenas dentro do conceito individual da GanttTool, sem introduzir colaboração, partilha ou dependência de projetos formais.

## 12. Âmbito inicial da análise

Nesta primeira fase, deve ser feita uma análise da ferramenta de Gantt atual para identificar:

- Funcionalidades que devem ser replicadas na GanttTool.
- Funcionalidades que devem ser simplificadas.
- Funcionalidades que não fazem sentido numa ferramenta isolada e individual.
- Entidades atuais que podem servir de referência, incluindo project, tasks, subtasks, milestones, dependências, tipos de recursos e recursos.
- Componentes frontend que podem ser reutilizados.
- Serviços existentes que podem ser reutilizados ou adaptados.
- Endpoints existentes que podem servir de referência.
- Novos endpoints necessários para a GanttTool.
- Regras de negócio que devem ser mantidas.
- Regras de negócio que devem ser removidas por estarem associadas ao contexto de projeto formal ou colaboração.
- Impactos técnicos no frontend.
- Impactos técnicos no backend.
- Impactos na base de dados.
- Impactos em permissões e feature flags.
- Impactos no sistema de planos e limites.
- Impactos nas traduções i18n.
- Impactos no menu lateral da aplicação, incluindo a entrada **Tool > Gantt**.

## 13. Pontos que não devem existir na GanttTool

Os pontos abaixo não devem ser entendidos como limitações temporárias desta fase.

Eles representam decisões de produto que não devem ser implementadas na **GanttTool**, nem agora nem em fases futuras, porque a ferramenta deve permanecer individual, simples, rápida e independente da gestão completa de projetos.

A **GanttTool** não deve introduzir:

- Convite de utilizadores.
- Colaboradores dentro dos planeamentos.
- Participantes nos planeamentos.
- Membros convidados.
- Permissões por planeamento semelhantes às permissões de projeto.
- Associação obrigatória a projetos formais da aplicação.
- Dependência de membros de projeto.
- Partilha de planeamentos entre utilizadores.
- Partilha de recursos entre utilizadores.
- Recursos globais colaborativos.
- Fluxos de aprovação por outros utilizadores.
- Alterações no comportamento do Gantt existente nos projetos.
- Alterações em chaves i18n do Gantt que possam impactar a ferramenta atual.

## 14. Resultado esperado da análise

A análise deve produzir uma proposta inicial contendo:

- Mapeamento das funcionalidades atuais do Gantt de projetos.
- Identificação do que deve ser replicado na GanttTool.
- Identificação do que deve ser simplificado ou removido.
- Sugestão de modelo de dados com entidades usando nomenclatura **GanttTool**.
- Sugestão de entidades necessárias, incluindo GanttToolPlan, GanttToolProject, GanttToolTask, GanttToolSubtask, GanttToolMilestone, GanttToolDependency, GanttToolResourceType e GanttToolResource.
- Sugestão de endpoints necessários.
- Sugestão de componentes frontend a reutilizar.
- Sugestão de regras para feature flag `gantttool_view`.
- Sugestão de regras para apresentação no menu lateral em **Tool > Gantt**.
- Sugestão de regras para contadores e limites de planos.
- Sugestão de estratégia i18n para reutilização do namespace do Gantt e criação do namespace `gantttool`.
- Pontos de atenção técnicos.
- Possíveis riscos.
- Proposta inicial de fases de implementação.

## 15. Resumo para orientação da implementação

A **GanttTool** deve ser uma nova funcionalidade autónoma de planeamento rápido baseada na ferramenta de Gantt existente nos projetos.

Ela deve replicar a experiência e funcionalidades principais do Gantt atual, incluindo project, tasks, subtasks, milestones, dependências, tipos de recursos e recursos, mas sem depender da criação de projetos formais da aplicação, sem colaboradores, sem convites, sem partilha e sem permissões complexas de projeto.

Cada planeamento da **GanttTool** pertence exclusivamente ao utilizador logado que o criou.

Todos os recursos, project, tasks, subtasks, milestones, dependências e configurações são criados e geridos pelo próprio utilizador.

A funcionalidade deve ser controlada pela feature flag `gantttool_view`.

Quando a feature flag estiver ativa no plano do utilizador, a funcionalidade deverá aparecer no menu lateral da aplicação em **Tool > Gantt**.

A implementação deve incluir contadores para limites de planos, contabilizando:

- Quantidade de planeamentos da GanttTool por utilizador.
- Quantidade de tasks por planeamento, considerando tasks e subtasks no mesmo total.
- Quantidade de recursos por planeamento.

Deve ser avaliado se milestones entram no limite de tasks ou se necessitam de um limite próprio.

Toda a nomenclatura nova deve referenciar **GanttTool**, como `GanttToolResources`, `GanttToolPlan`, `GanttToolProject`, `GanttToolTask`, `GanttToolSubtask`, `GanttToolMilestone`, `GanttToolResourceType` e estruturas equivalentes.

A GanttTool pode reutilizar o namespace de i18n do Gantt quando os textos forem comuns, mas qualquer texto novo, específico ou alterado deve ser criado num namespace próprio, preferencialmente `gantttool`.

A implementação não deve alterar o comportamento atual do Gantt utilizado nos projetos.

A **GanttTool** deve permanecer uma ferramenta individual do utilizador logado, sem colaboradores, sem convites, sem partilha de planeamentos e sem dependência de projetos formais, tanto na implementação inicial como em qualquer evolução futura.

