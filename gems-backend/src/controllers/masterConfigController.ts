import { Request, Response } from 'express'
import { MasterConfig, VALID_ACTIONS } from '../models/MasterConfig'

export const getMasterConfig = async (req: Request, res: Response) => {
  const { tenantId } = req.params
  const config = await MasterConfig.findOne({ tenantId })
  res.json(config ?? { tenantId, operationalKeys: [] })
}

export const upsertMasterConfig = async (req: Request, res: Response) => {
  const { tenantId } = req.params
  const { operationalKeys } = req.body

  if (!Array.isArray(operationalKeys)) {
    return res.status(400).json({ message: 'operationalKeys must be an array' })
  }

  for (const key of operationalKeys) {
    if (!key.fieldName || !key.label) {
      return res.status(400).json({ message: 'Each operational key must have fieldName and label' })
    }
    for (const vm of key.valueMappings ?? []) {
      if (!vm.sourceValue || !VALID_ACTIONS.includes(vm.action)) {
        return res.status(400).json({
          message: `Invalid value mapping — action must be one of: ${VALID_ACTIONS.join(', ')}`,
        })
      }
    }
  }

  const config = await MasterConfig.findOneAndUpdate(
    { tenantId },
    { tenantId, operationalKeys },
    { new: true, upsert: true, runValidators: true }
  )
  res.json(config)
}
