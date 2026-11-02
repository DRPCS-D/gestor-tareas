import { describe, expect, it } from 'vitest'
import { guardarRegistro, quitarDeLista } from './parches'

const lista = [
  { id: 'a', titulo: 'Foco', estado: 'pendiente' },
  { id: 'b', titulo: 'Puerta', estado: 'pendiente' },
]

describe('guardarRegistro', () => {
  it('reemplaza el registro existente sin tocar los demás', () => {
    const r = guardarRegistro(lista, { id: 'a', titulo: 'Foco', estado: 'completada' })
    expect(r).toEqual([
      { id: 'a', titulo: 'Foco', estado: 'completada' },
      { id: 'b', titulo: 'Puerta', estado: 'pendiente' },
    ])
    expect(r[1]).toBe(lista[1])
  })

  it('pone el registro nuevo al principio', () => {
    const r = guardarRegistro(lista, { id: 'c', titulo: 'Grifo', estado: 'pendiente' })
    expect(r.map((x) => x.id)).toEqual(['c', 'a', 'b'])
  })

  it('no modifica la lista original', () => {
    guardarRegistro(lista, { id: 'c', titulo: 'Grifo', estado: 'pendiente' })
    expect(lista).toHaveLength(2)
  })
})

describe('quitarDeLista', () => {
  it('quita el registro indicado', () => {
    expect(quitarDeLista(lista, 'a').map((x) => x.id)).toEqual(['b'])
  })

  it('si no existe, deja la lista igual', () => {
    expect(quitarDeLista(lista, 'z')).toEqual(lista)
  })
})
