export interface PatientProps {
  id: string;
  nome: string;
  tel: string;
  proc: string;
  valor: string;
  col?: 'ligar' | 'contato' | 'agendado' | 'final';
  tent?: number;
  obs?: string;
  res?: 'agendou' | 'procedimento' | 'sem-interesse' | 'sem-resposta' | null;
  dt?: string | null;
}

export class Patient {
  public readonly id: string;
  public nome: string;
  public tel: string;
  public proc: string;
  public valor: string;
  public col: 'ligar' | 'contato' | 'agendado' | 'final';
  public tent: number;
  public obs: string;
  public res: 'agendou' | 'procedimento' | 'sem-interesse' | 'sem-resposta' | null;
  public dt: string | null;

  constructor(props: PatientProps) {
    this.id = props.id;
    this.nome = props.nome.toUpperCase();
    this.tel = props.tel;
    this.proc = props.proc;
    this.valor = props.valor;
    this.col = props.col || 'ligar';
    this.tent = props.tent !== undefined ? props.tent : 0;
    this.obs = props.obs || '';
    this.res = props.res || null;
    this.dt = props.dt || null;
  }

  // Regra de negócio: Atualizar progresso de tentativas
  public registerAttempt(n: number) {
    if (n === this.tent) {
      // Se clicou no mesmo número atual, volta um passo
      this.tent = Math.max(0, this.tent - 1);
    } else if (n === this.tent + 1) {
      // Se avançou um passo
      this.tent = n;
      // Regra de transição automática do Kanban: se está para ligar e inicia tentativas, vai para "Em Contato"
      if (this.col === 'ligar') {
        this.col = 'contato';
      }
    }
  }

  // Regra de negócio: Mover de coluna
  public moveTo(col: 'ligar' | 'contato' | 'agendado' | 'final') {
    this.col = col;
  }

  // Regra de negócio: Finalizar com um desfecho específico
  public finalize(res: 'agendou' | 'procedimento' | 'sem-interesse' | 'sem-resposta', dateBrStr: string) {
    this.col = 'final';
    this.res = res;
    this.dt = dateBrStr;
  }

  public toJSON() {
    return {
      id: this.id,
      nome: this.nome,
      tel: this.tel,
      proc: this.proc,
      valor: this.valor,
      col: this.col,
      tent: this.tent,
      obs: this.obs,
      res: this.res,
      dt: this.dt
    };
  }
}
