function isoDate(daysFromToday) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  return date.toISOString().slice(0, 10);
}

function isoDateTime(daysOffset) {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString();
}

export function createInitialSnapshot() {
  const now = new Date().toISOString();

  return {
    updatedAt: now,
    inventory: [
      {
        id: 'inv-1',
        name: 'ウシ血清アルブミン (BSA)',
        category: 'protein',
        quantity: 50,
        unit: 'mg',
        minQuantity: 10,
        expiryDate: isoDate(240),
        location: '冷蔵庫 A1',
        notes: 'タンパク質定量用',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'inv-2',
        name: 'マウス抗ヒトβアクチン抗体',
        category: 'antibody',
        quantity: 5,
        unit: 'mL',
        minQuantity: 2,
        expiryDate: isoDate(120),
        location: '冷凍庫 B2',
        notes: 'Western blot用',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'inv-3',
        name: 'ウサギ抗マウスIgG (HRP)',
        category: 'antibody',
        quantity: 3,
        unit: 'mL',
        minQuantity: 1,
        expiryDate: isoDate(180),
        location: '冷凍庫 B3',
        notes: '二次抗体',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'inv-4',
        name: 'DMEM培地',
        category: 'reagent',
        quantity: 2,
        unit: 'L',
        minQuantity: 1,
        expiryDate: isoDate(45),
        location: '冷蔵庫 A2',
        notes: '細胞培養用',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'inv-5',
        name: 'PBS (10x)',
        category: 'reagent',
        quantity: 1,
        unit: '本',
        minQuantity: 1,
        expiryDate: isoDate(60),
        location: '試薬棚 C4',
        notes: '洗浄バッファー',
        createdAt: now,
        updatedAt: now,
      },
    ],
    orders: [
      {
        id: 'ord-1',
        orderNumber: 'ORD-2026-001',
        items: [
          {
            id: 'ord-1-item-1',
            itemName: 'PBS (10x)',
            quantity: 1,
            unitPrice: 5000,
            totalPrice: 5000,
          },
          {
            id: 'ord-1-item-2',
            itemName: 'Tris-HCl pH 8.0',
            quantity: 2,
            unitPrice: 3000,
            totalPrice: 6000,
          },
        ],
        totalAmount: 11000,
        status: 'approved',
        notes: 'バッファー類',
        createdAt: isoDateTime(-7),
        updatedAt: isoDateTime(-7),
      },
      {
        id: 'ord-2',
        orderNumber: 'ORD-2026-002',
        items: [
          {
            id: 'ord-2-item-1',
            itemName: 'マウス抗ヒトβアクチン抗体',
            quantity: 1,
            unitPrice: 25000,
            totalPrice: 25000,
          },
        ],
        totalAmount: 25000,
        status: 'submitted',
        notes: '免疫染色用',
        createdAt: isoDateTime(-3),
        updatedAt: isoDateTime(-3),
      },
    ],
    protocols: [
      {
        id: 'prot-1',
        title: 'Western Blot',
        category: 'タンパク質解析',
        description: 'SDS-PAGEを用いたタンパク質の分離と検出',
        steps: [
          {
            stepNumber: 1,
            title: 'サンプル調製',
            description: 'タンパク質サンプルをローディングバッファーで希釈する',
            materials: ['サンプル', 'ローディングバッファー', 'マイクロチューブ'],
            duration: '10分',
          },
          {
            stepNumber: 2,
            title: 'ゲル電気泳動',
            description: 'SDS-PAGEゲルでサンプルを分離する',
            materials: ['SDS-PAGEゲル', '電気泳動装置', '電源装置'],
            duration: '90分',
          },
        ],
        estimatedTime: '3-4時間',
        difficulty: 'medium',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'prot-2',
        title: 'ELISA',
        category: 'タンパク質定量',
        description: '酵素結合免疫吸着測定法によるタンパク質検出',
        steps: [
          {
            stepNumber: 1,
            title: 'プレートコーティング',
            description: '96ウェルプレートに抗体をコーティングする',
            materials: ['96ウェルプレート', 'コーティング抗体', 'コーティングバッファー'],
            duration: '2時間',
          },
          {
            stepNumber: 2,
            title: 'ブロッキング',
            description: 'プレートをブロッキング液で処理する',
            materials: ['ブロッキング液', 'インキュベーター'],
            duration: '1時間',
          },
        ],
        estimatedTime: '4-5時間',
        difficulty: 'easy',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'prot-3',
        title: 'PCR',
        category: 'DNA増幅',
        description: 'ポリメラーゼ連鎖反応によるDNA増幅',
        steps: [
          {
            stepNumber: 1,
            title: 'PCRミックス調製',
            description: 'テンプレートDNA、プライマー、dNTPを混合する',
            materials: ['テンプレートDNA', 'プライマー', 'dNTP', 'PCRバッファー'],
            duration: '15分',
          },
          {
            stepNumber: 2,
            title: 'PCR反応',
            description: 'サーマルサイクラーで増幅反応を実施する',
            materials: ['サーマルサイクラー', 'PCRチューブ'],
            duration: '120分',
          },
        ],
        estimatedTime: '2-3時間',
        difficulty: 'easy',
        createdAt: now,
        updatedAt: now,
      },
    ],
  };
}
