import { extractStimParamVector } from './modules/services/stimParamParsing';

test('extracts stim params from loaded JSON objects', () => {
  expect(extractStimParamVector({ v: [1, '2.5', 0] })).toEqual([1, 2.5, 0]);
  expect(extractStimParamVector({ optimization: { 0: ['3', 4] } })).toEqual([3, 4]);
});

test('extracts stim params from pasted JSON strings', () => {
  expect(extractStimParamVector('{"v": [0.5, "1.25"]}')).toEqual([0.5, 1.25]);
});
