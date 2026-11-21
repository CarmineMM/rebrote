import { describe, expect, it } from 'vitest';
import { NAME_MAX_LENGTH, NICKNAME, cleanName, isValidName, limitName, nameLength } from './playerName';

const char = (code: number) => String.fromCodePoint(code);

describe('nombre del jugador (T-033)', () => {
  it('se guarda sin los espacios del principio y del final', () => {
    expect(cleanName('   Ana  ')).toBe('Ana');
    expect(cleanName('Carmine')).toBe('Carmine');
  });

  it('vacio o solo con espacios no vale: el boton de confirmar esta apagado', () => {
    expect(isValidName('')).toBe(false);
    expect(isValidName('    ')).toBe(false);
    expect(isValidName(`\t${char(0x3000)} ${char(0xa0)}`)).toBe(false);
    expect(isValidName(' a ')).toBe(true);
  });

  it('los espacios invisibles no cuentan como nombre', () => {
    expect(isValidName(char(0x200b) + char(0xfeff))).toBe(false);
    expect(cleanName(`An${char(0x200b)}a`)).toBe('Ana');
  });

  it('un solo espacio entre palabras, y el del final se deja mientras se escribe', () => {
    expect(limitName('Ana   María')).toBe('Ana María');
    expect(limitName('Ana ')).toBe('Ana ');
    expect(limitName('  Ana')).toBe('Ana');
    expect(cleanName('Ana María ')).toBe('Ana María');
  });

  it(`no entran mas de ${NAME_MAX_LENGTH} letras: la decimotercera no entra`, () => {
    expect(limitName('ABCDEFGHIJKLM')).toBe('ABCDEFGHIJKL');
    expect(nameLength(limitName('M'.repeat(40)))).toBe(NAME_MAX_LENGTH);
    expect(limitName('ABCDEFGHIJKL')).toBe('ABCDEFGHIJKL');
  });

  it('tildes, eñes, otros alfabetos y emojis se aceptan y cuentan como una letra', () => {
    expect(nameLength('Íñigo')).toBe(5);
    // Una "n" con la tilde de la eñe aparte sigue siendo una letra.
    expect(nameLength(`n${char(0x303)}`)).toBe(1);
    expect(nameLength('Сергей')).toBe(6);
    expect(nameLength('さくら')).toBe(3);
    expect(nameLength('🌱')).toBe(1);
    // Una familia de emojis va unida (U+200D) y cuenta como una.
    const family = ['👩', '👩', '👧', '👦'].join(char(0x200d));
    expect(nameLength(family)).toBe(1);
    expect(isValidName(family)).toBe(true);
    expect(nameLength(limitName(`${'🌵'.repeat(11)}${family}${family}`))).toBe(NAME_MAX_LENGTH);
  });

  it('sin saltos de linea ni caracteres que den la vuelta al texto', () => {
    expect(cleanName('Ana\nMaría')).toBe('Ana María');
    expect(cleanName(`${char(0x202e)}Ana`)).toBe('Ana');
    expect(cleanName(`Ana${char(0x2066)}`)).toBe('Ana');
  });

  it('el nombre se guarda como texto: nada se interpreta', () => {
    expect(cleanName('<b>Ana</b>')).toBe('<b>Ana</b>');
  });

  it('el apodo de Boxer (NJ-03) es un nombre valido y es el mismo en todos los idiomas', () => {
    expect(NICKNAME).toBe('Rookie');
    expect(isValidName(NICKNAME)).toBe(true);
    expect(cleanName(NICKNAME)).toBe(NICKNAME);
  });
});
