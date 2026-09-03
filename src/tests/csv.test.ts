import { parsePlayersCsv } from '../csv';

describe('parsePlayersCsv', () => {
  it('parses valid rows into players', () => {
    const csv = 'Rank,Position,Name,Team,Bye\n1,qb,Josh Allen,BUF,12\n2,RB,Bijan Robinson,ATL,5\n';

    const { players, errors } = parsePlayersCsv(csv);

    expect(errors).toEqual([]);
    expect(players).toHaveLength(2);
    expect(players[0]).toMatchObject({
      rank: 1,
      position: 'QB',
      name: 'Josh Allen',
      team: 'BUF',
      bye: 12,
      draftedBy: null,
      draftedOther: false,
    });
    expect(players[0].id).toEqual(expect.any(String));
    expect(players[1]).toMatchObject({
      rank: 2,
      position: 'RB',
      name: 'Bijan Robinson',
      team: 'ATL',
      bye: 5,
    });
  });

  it('normalizes header case and whitespace', () => {
    const csv = ' RANK , Position ,name,TEAM,bye \n1,WR,CeeDee Lamb,DAL,7\n';

    const { players, errors } = parsePlayersCsv(csv);

    expect(errors).toEqual([]);
    expect(players).toHaveLength(1);
    expect(players[0].name).toBe('CeeDee Lamb');
  });

  it('reports missing required columns and returns no players', () => {
    const csv = 'Rank,Name\n1,Josh Allen\n';

    const { players, errors } = parsePlayersCsv(csv);

    expect(players).toEqual([]);
    expect(errors).toEqual(['Missing required column(s): position, team, bye']);
  });

  it('rejects a row with a non-numeric rank', () => {
    const csv = 'Rank,Position,Name,Team,Bye\nabc,QB,Josh Allen,BUF,12\n';

    const { players, errors } = parsePlayersCsv(csv);

    expect(players).toEqual([]);
    expect(errors).toEqual(['Row 2: invalid Rank "abc"']);
  });

  it('rejects a row with an invalid position', () => {
    const csv = 'Rank,Position,Name,Team,Bye\n1,XX,Josh Allen,BUF,12\n';

    const { players, errors } = parsePlayersCsv(csv);

    expect(players).toEqual([]);
    expect(errors).toEqual(['Row 2: invalid Position "XX"']);
  });

  it('rejects a row with a missing name', () => {
    const csv = 'Rank,Position,Name,Team,Bye\n1,QB,,BUF,12\n';

    const { players, errors } = parsePlayersCsv(csv);

    expect(players).toEqual([]);
    expect(errors).toEqual(['Row 2: missing Name']);
  });

  it('rejects a row with a missing team', () => {
    const csv = 'Rank,Position,Name,Team,Bye\n1,QB,Josh Allen,,12\n';

    const { players, errors } = parsePlayersCsv(csv);

    expect(players).toEqual([]);
    expect(errors).toEqual(['Row 2: missing Team']);
  });

  it('rejects a row with a non-numeric bye', () => {
    const csv = 'Rank,Position,Name,Team,Bye\n1,QB,Josh Allen,BUF,bye-week\n';

    const { players, errors } = parsePlayersCsv(csv);

    expect(players).toEqual([]);
    expect(errors).toEqual(['Row 2: invalid Bye "bye-week"']);
  });

  it('keeps valid rows and reports errors for invalid ones in the same file', () => {
    const csv = 'Rank,Position,Name,Team,Bye\n1,QB,Josh Allen,BUF,12\n2,ZZ,Bad Row,DAL,7\n3,RB,Bijan Robinson,ATL,5\n';

    const { players, errors } = parsePlayersCsv(csv);

    expect(players).toHaveLength(2);
    expect(players.map((p) => p.name)).toEqual(['Josh Allen', 'Bijan Robinson']);
    expect(errors).toEqual(['Row 3: invalid Position "ZZ"']);
  });

  it('skips empty lines', () => {
    const csv = 'Rank,Position,Name,Team,Bye\n1,QB,Josh Allen,BUF,12\n\n2,RB,Bijan Robinson,ATL,5\n';

    const { players, errors } = parsePlayersCsv(csv);

    expect(errors).toEqual([]);
    expect(players).toHaveLength(2);
  });

  it('assigns each player a unique id', () => {
    const csv = 'Rank,Position,Name,Team,Bye\n1,QB,Josh Allen,BUF,12\n2,RB,Bijan Robinson,ATL,5\n';

    const { players } = parsePlayersCsv(csv);

    expect(players[0].id).not.toBe(players[1].id);
  });
});
