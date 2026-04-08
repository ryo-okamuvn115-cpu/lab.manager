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
        name: 'Bovine Serum Albumin (BSA)',
        category: 'protein',
        quantity: 50,
        unit: 'mg',
        minQuantity: 10,
        expiryDate: isoDate(240),
        location: 'Fridge A1',
        notes: 'For protein quantification',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'inv-2',
        name: 'Mouse Anti-Human Beta Actin Antibody',
        category: 'antibody',
        quantity: 5,
        unit: 'mL',
        minQuantity: 2,
        expiryDate: isoDate(120),
        location: 'Freezer B2',
        notes: 'For Western blot',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'inv-3',
        name: 'Rabbit Anti-Mouse IgG (HRP)',
        category: 'antibody',
        quantity: 3,
        unit: 'mL',
        minQuantity: 1,
        expiryDate: isoDate(180),
        location: 'Freezer B3',
        notes: 'Secondary antibody',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'inv-4',
        name: 'DMEM Medium',
        category: 'reagent',
        quantity: 2,
        unit: 'L',
        minQuantity: 1,
        expiryDate: isoDate(45),
        location: 'Fridge A2',
        notes: 'For cell culture',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'inv-5',
        name: 'PBS (10x)',
        category: 'reagent',
        quantity: 1,
        unit: 'bottle',
        minQuantity: 1,
        expiryDate: isoDate(60),
        location: 'Shelf C4',
        notes: 'Wash buffer',
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
        notes: 'Buffer reagents',
        createdAt: isoDateTime(-7),
        updatedAt: isoDateTime(-7),
      },
      {
        id: 'ord-2',
        orderNumber: 'ORD-2026-002',
        items: [
          {
            id: 'ord-2-item-1',
            itemName: 'Mouse Anti-Human Beta Actin Antibody',
            quantity: 1,
            unitPrice: 25000,
            totalPrice: 25000,
          },
        ],
        totalAmount: 25000,
        status: 'submitted',
        notes: 'For immunostaining',
        createdAt: isoDateTime(-3),
        updatedAt: isoDateTime(-3),
      },
    ],
    protocols: [
      {
        id: 'prot-1',
        title: 'Western Blot',
        category: 'Protein Analysis',
        description: 'Separate and detect proteins with SDS-PAGE and transfer.',
        steps: [
          {
            id: 'step-1',
            stepNumber: 1,
            title: 'Sample Preparation',
            description: 'Dilute protein samples with loading buffer.',
            materials: ['Sample', 'Loading buffer', 'Microtube'],
            duration: '10 min',
          },
          {
            id: 'step-2',
            stepNumber: 2,
            title: 'Electrophoresis',
            description: 'Separate samples on an SDS-PAGE gel.',
            materials: ['SDS-PAGE gel', 'Electrophoresis unit', 'Power supply'],
            duration: '90 min',
          },
        ],
        estimatedTime: '3-4 h',
        difficulty: 'medium',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'prot-2',
        title: 'ELISA',
        category: 'Protein Quantification',
        description: 'Measure proteins with enzyme-linked immunosorbent assay.',
        steps: [
          {
            id: 'step-3',
            stepNumber: 1,
            title: 'Plate Coating',
            description: 'Coat antibodies onto a 96-well plate.',
            materials: ['96-well plate', 'Capture antibody', 'Coating buffer'],
            duration: '2 h',
          },
          {
            id: 'step-4',
            stepNumber: 2,
            title: 'Blocking',
            description: 'Block the plate before sample incubation.',
            materials: ['Blocking buffer', 'Incubator'],
            duration: '1 h',
          },
        ],
        estimatedTime: '4-5 h',
        difficulty: 'easy',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'prot-3',
        title: 'PCR',
        category: 'DNA Amplification',
        description: 'Amplify DNA targets by polymerase chain reaction.',
        steps: [
          {
            id: 'step-5',
            stepNumber: 1,
            title: 'Mix Preparation',
            description: 'Prepare template DNA, primers, and dNTP mixture.',
            materials: ['Template DNA', 'Primers', 'dNTP', 'PCR buffer'],
            duration: '15 min',
          },
          {
            id: 'step-6',
            stepNumber: 2,
            title: 'Thermal Cycling',
            description: 'Run amplification in the thermal cycler.',
            materials: ['Thermal cycler', 'PCR tubes'],
            duration: '120 min',
          },
        ],
        estimatedTime: '2-3 h',
        difficulty: 'easy',
        createdAt: now,
        updatedAt: now,
      },
    ],
  };
}
