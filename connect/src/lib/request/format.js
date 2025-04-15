import { omit, keys } from 'ramda'
/**
if mode == 'legacy' then request should create an ans-104 from fields
if mode == 'relay' then request should create a hybrid ans-104/httpsig from fields
if mode == 'process' then request should create a pure httpsig from fields
  */
export const handleFormat = (mode, device) => (fields) => {
  if (mode === 'mainnet' && device === 'relay@1.0') {
    const dataItem = {
      target: fields.Target ?? fields.process,
      anchor: fields.Anchor ?? '',
      tags: keys(
        omit(
          [
            'Target',
            'Anchor',
            'Data',
            'dryrun',
            'Type',
            'Variant',
            'path',
            'method'
          ],
          fields
        )
      )
        .map(function (key) {
          return { name: key, value: fields[key] }
        }, fields)
        .concat([
          { name: 'Data-Protocol', value: 'ao' },
          { name: 'Type', value: fields.Type ?? 'Message' },
          { name: 'Variant', value: fields.Variant ?? 'ao.N.1' }
        ]),
      data: fields?.data || ''
    }

    let _type = fields.Type ?? 'Message'
    if (fields.dryrun) {
      _type = 'dryrun'
    }
    return {
      type: _type,
      dataItem
    }
  }

  if (mode === 'mainnet') {
    const map = fields

    if (!fields.path) {
      fields.path = '/schedule'
    }

    if (fields.process && !fields.path.includes(fields.process)) {
      fields.path = `${fields.process}${fields.path}`
    }

    return {
      type: fields.Type,
      map
    }
  }
}
