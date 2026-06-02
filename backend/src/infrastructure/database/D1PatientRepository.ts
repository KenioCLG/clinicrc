import { PatientRepository } from "../../../domain/repositories/PatientRepository";
import { Patient } from "../../../domain/entities/Patient";

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<any[]>;
}

export interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  all<T = any>(): Promise<{ results: T[] }>;
  first<T = any>(): Promise<T | null>;
  run(): Promise<{ success: boolean }>;
}

export class D1PatientRepository implements PatientRepository {
  constructor(private db: D1Database) {}

  private mapRowToPatient(row: any): Patient {
    return new Patient({
      id: row.id,
      nome: row.nome,
      tel: row.tel,
      proc: row.proc,
      valor: row.valor,
      col: row.col,
      tent: Number(row.tent),
      obs: row.obs,
      res: row.res,
      dt: row.dt
    });
  }

  async findAll(): Promise<Patient[]> {
    const { results } = await this.db.prepare("SELECT * FROM patients").all<any>();
    return results.map(row => this.mapRowToPatient(row));
  }

  async findById(id: string): Promise<Patient | null> {
    const row = await this.db.prepare("SELECT * FROM patients WHERE id = ?").bind(id).first<any>();
    if (!row) return null;
    return this.mapRowToPatient(row);
  }

  async save(patient: Patient): Promise<void> {
    await this.db.prepare(
      `INSERT INTO patients (id, nome, tel, proc, valor, col, tent, obs, res, dt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         nome = excluded.nome,
         tel = excluded.tel,
         proc = excluded.proc,
         valor = excluded.valor,
         col = excluded.col,
         tent = excluded.tent,
         obs = excluded.obs,
         res = excluded.res,
         dt = excluded.dt`
    ).bind(
      patient.id,
      patient.nome,
      patient.tel,
      patient.proc,
      patient.valor,
      patient.col,
      patient.tent,
      patient.obs,
      patient.res,
      patient.dt
    ).run();
  }

  async saveMany(patients: Patient[]): Promise<void> {
    const statements = patients.map(p => {
      return this.db.prepare(
        `INSERT INTO patients (id, nome, tel, proc, valor, col, tent, obs, res, dt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           nome = excluded.nome,
           tel = excluded.tel,
           proc = excluded.proc,
           valor = excluded.valor,
           col = excluded.col,
           tent = excluded.tent,
           obs = excluded.obs,
           res = excluded.res,
           dt = excluded.dt`
      ).bind(
        p.id,
        p.nome,
        p.tel,
        p.proc,
        p.valor,
        p.col,
        p.tent,
        p.obs,
        p.res,
        p.dt
      );
    });
    await this.db.batch(statements);
  }

  async resetAll(initialPatients: Patient[]): Promise<void> {
    const statements = [];
    statements.push(this.db.prepare("DELETE FROM patients"));
    
    initialPatients.forEach(p => {
      statements.push(
        this.db.prepare(
          "INSERT INTO patients (id, nome, tel, proc, valor, col, tent, obs, res, dt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        ).bind(p.id, p.nome, p.tel, p.proc, p.valor, p.col, p.tent, p.obs, p.res, p.dt)
      );
    });

    await this.db.batch(statements);
  }
}
