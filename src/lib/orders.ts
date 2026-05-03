import { createEmptyOrderDraft, type OrderDraft } from '@/lib/types';

function pad(value: number) {
  return value.toString().padStart(2, '0');
}

export function createSuggestedOrderNumber(date = new Date()) {
  return `ORD-${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
}

export function createOrderDraftFromProtocolMaterial(params: {
  materialName: string;
  protocolTitle: string;
  stepTitle: string;
}): OrderDraft {
  const draft = createEmptyOrderDraft();
  const stepContext = params.stepTitle.trim() ? ` / 手順: ${params.stepTitle.trim()}` : '';

  return {
    ...draft,
    orderNumber: createSuggestedOrderNumber(),
    notes: `プロトコル「${params.protocolTitle.trim()}」${stepContext} から追加`,
    items: [
      {
        itemName: params.materialName.trim(),
        quantity: 1,
        unitPrice: 0,
      },
    ],
  };
}
