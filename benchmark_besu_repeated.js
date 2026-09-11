const { ethers } = require("hardhat");
const { NonceManager } = require("@ethersproject/experimental");
const fs = require("fs");
const path = require("path");

// ============================================================
// Helper: Execute transaction and measure confirmation latency
// ============================================================

async function executeAndMeasure(label, transactionPromise) {
  const startTime = process.hrtime.bigint();

  const transaction = await transactionPromise;
  const receipt = await transaction.wait();

  const endTime = process.hrtime.bigint();

  const latencyMs =
    Number(endTime - startTime) / 1_000_000;

  return {
    operation: label,
    transactionHash: receipt.transactionHash,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString(),
    latencyMs: latencyMs.toFixed(3),
    status: receipt.status
  };
}


// ============================================================
// Helper: Fund stakeholder wallet
// ============================================================

async function fundWallet(
  regulatoryAuthority,
  wallet,
  amount = "10"
) {
  const tx = await regulatoryAuthority.sendTransaction({
    to: wallet.address,
    value: ethers.utils.parseEther(amount),
    gasPrice: 0
  });

  await tx.wait();
}


// ============================================================
// Main benchmark
// ============================================================

async function main() {

  const results = [];

  // ==========================================================
  // 1. REGULATORY AUTHORITY
  // ==========================================================

const [baseRegulatoryAuthority] =
  await ethers.getSigners();

const regulatoryAuthority =
  new NonceManager(baseRegulatoryAuthority);

// Synchronize explicitly with the current pending nonce
const currentNonce =
  await ethers.provider.getTransactionCount(
    baseRegulatoryAuthority.address,
    "pending"
  );

regulatoryAuthority.setTransactionCount(currentNonce);

console.log(
  "Starting regulatory authority nonce:",
  currentNonce
);


  // ==========================================================
  // 2. CREATE DISTINCT STAKEHOLDER WALLETS
  // ==========================================================

  const manufacturer =
    ethers.Wallet.createRandom().connect(ethers.provider);

  const distributor =
    ethers.Wallet.createRandom().connect(ethers.provider);

  const transporter =
    ethers.Wallet.createRandom().connect(ethers.provider);

  const hospital =
    ethers.Wallet.createRandom().connect(ethers.provider);

  const biomedicalEngineer =
    ethers.Wallet.createRandom().connect(ethers.provider);

  const maintenanceProvider =
    ethers.Wallet.createRandom().connect(ethers.provider);

  const insuranceProvider =
    ethers.Wallet.createRandom().connect(ethers.provider);

  const disposalAgency =
    ethers.Wallet.createRandom().connect(ethers.provider);


  console.log("\nStakeholder wallets created.");

  console.log("Manufacturer:", manufacturer.address);
  console.log("Distributor:", distributor.address);
  console.log("Transporter:", transporter.address);
  console.log("Hospital:", hospital.address);
  console.log(
    "Biomedical Engineer:",
    biomedicalEngineer.address
  );
  console.log(
    "Maintenance Provider:",
    maintenanceProvider.address
  );
  console.log(
    "Insurance Provider:",
    insuranceProvider.address
  );
  console.log(
    "Disposal Agency:",
    disposalAgency.address
  );


  // ==========================================================
  // 3. FUND STAKEHOLDER WALLETS
  // ==========================================================

  console.log("\nFunding stakeholder wallets...");

  const stakeholderWallets = [
    manufacturer,
    distributor,
    transporter,
    hospital,
    biomedicalEngineer,
    maintenanceProvider,
    insuranceProvider,
    disposalAgency
  ];

  for (const wallet of stakeholderWallets) {
    await fundWallet(
      regulatoryAuthority,
      wallet,
      "10"
    );
  }

  console.log(
    "All stakeholder wallets funded with test ETH."
  );


  // ==========================================================
  // 4. DEPLOY CONTRACTS
  // ==========================================================

  console.log("\nDeploying contracts...");


  // --------------------
  // Entity Enrollment
  // --------------------

  const EntityEnrollment =
    await ethers.getContractFactory(
      "EntityEnrollmentContract",
      regulatoryAuthority
    );

  const entityEnrollment =
    await EntityEnrollment.deploy();

  await entityEnrollment.deployed();

  console.log(
    "EntityEnrollmentContract:",
    entityEnrollment.address
  );


  // --------------------
  // Equipment Registration
  // --------------------

  const EquipmentRegistration =
    await ethers.getContractFactory(
      "EquipmentRegistrationContract",
      regulatoryAuthority
    );

  const equipmentRegistration =
    await EquipmentRegistration.deploy(
      entityEnrollment.address
    );

  await equipmentRegistration.deployed();

  console.log(
    "EquipmentRegistrationContract:",
    equipmentRegistration.address
  );


  // --------------------
  // Ownership Shipment
  // --------------------

  const OwnershipShipment =
    await ethers.getContractFactory(
      "OwnershipShipmentContract",
      regulatoryAuthority
    );

  const ownershipShipment =
    await OwnershipShipment.deploy(
      entityEnrollment.address,
      equipmentRegistration.address
    );

  await ownershipShipment.deployed();

  console.log(
    "OwnershipShipmentContract:",
    ownershipShipment.address
  );


  // --------------------
  // Installation Calibration
  // --------------------

  const InstallationCalibration =
    await ethers.getContractFactory(
      "InstallationCalibrationContract",
      regulatoryAuthority
    );

  const installationCalibration =
    await InstallationCalibration.deploy(
      entityEnrollment.address,
      equipmentRegistration.address
    );

  await installationCalibration.deployed();

  console.log(
    "InstallationCalibrationContract:",
    installationCalibration.address
  );


  // --------------------
  // Maintenance Component
  // --------------------

  const MaintenanceComponent =
    await ethers.getContractFactory(
      "MaintenanceComponentContract",
      regulatoryAuthority
    );

  const maintenanceComponent =
    await MaintenanceComponent.deploy(
      entityEnrollment.address,
      equipmentRegistration.address
    );

  await maintenanceComponent.deployed();

  console.log(
    "MaintenanceComponentContract:",
    maintenanceComponent.address
  );


  // --------------------
  // Recall Disposal
  // --------------------

  const RecallDisposal =
    await ethers.getContractFactory(
      "RecallDisposalContract",
      regulatoryAuthority
    );

  const recallDisposal =
    await RecallDisposal.deploy(
      entityEnrollment.address,
      equipmentRegistration.address
    );

  await recallDisposal.deployed();

  console.log(
    "RecallDisposalContract:",
    recallDisposal.address
  );

  console.log(
    "\nContracts deployed successfully."
  );


  // ==========================================================
  // 5. AUTHORIZE LIFECYCLE CONTRACTS
  // ==========================================================

  console.log(
    "Authorizing lifecycle contracts..."
  );

  let tx =
    await equipmentRegistration
      .connect(regulatoryAuthority)
      .setAuthorizedLifecycleContract(
        ownershipShipment.address,
        true
      );

  await tx.wait();


  tx =
    await equipmentRegistration
      .connect(regulatoryAuthority)
      .setAuthorizedLifecycleContract(
        installationCalibration.address,
        true
      );

  await tx.wait();


  tx =
    await equipmentRegistration
      .connect(regulatoryAuthority)
      .setAuthorizedLifecycleContract(
        maintenanceComponent.address,
        true
      );

  await tx.wait();


  tx =
    await equipmentRegistration
      .connect(regulatoryAuthority)
      .setAuthorizedLifecycleContract(
        recallDisposal.address,
        true
      );

  await tx.wait();

  console.log(
    "Lifecycle contracts authorized."
  );


  // ==========================================================
  // 6. ENROLL STAKEHOLDERS
  // ==========================================================

  console.log(
    "\nEnrolling stakeholder entities..."
  );


  results.push(
    await executeAndMeasure(
      "Enroll Manufacturer",
      entityEnrollment
        .connect(regulatoryAuthority)
        .enrollEntity(
          manufacturer.address,
          "Medical Equipment Manufacturer",
          "LIC-EM-001",
          1
        )
    )
  );


  results.push(
    await executeAndMeasure(
      "Enroll Distributor",
      entityEnrollment
        .connect(regulatoryAuthority)
        .enrollEntity(
          distributor.address,
          "Authorized Distributor",
          "LIC-AD-001",
          2
        )
    )
  );


  results.push(
    await executeAndMeasure(
      "Enroll Transporter",
      entityEnrollment
        .connect(regulatoryAuthority)
        .enrollEntity(
          transporter.address,
          "Authorized Transporter",
          "LIC-TR-001",
          3
        )
    )
  );


  results.push(
    await executeAndMeasure(
      "Enroll Hospital",
      entityEnrollment
        .connect(regulatoryAuthority)
        .enrollEntity(
          hospital.address,
          "Healthcare Institution",
          "LIC-HI-001",
          4
        )
    )
  );


  results.push(
    await executeAndMeasure(
      "Enroll Biomedical Engineer",
      entityEnrollment
        .connect(regulatoryAuthority)
        .enrollEntity(
          biomedicalEngineer.address,
          "Biomedical Engineer",
          "LIC-BE-001",
          5
        )
    )
  );


  results.push(
    await executeAndMeasure(
      "Enroll Maintenance Provider",
      entityEnrollment
        .connect(regulatoryAuthority)
        .enrollEntity(
          maintenanceProvider.address,
          "Maintenance Service Provider",
          "LIC-MSP-001",
          6
        )
    )
  );


  results.push(
    await executeAndMeasure(
      "Enroll Insurance Provider",
      entityEnrollment
        .connect(regulatoryAuthority)
        .enrollEntity(
          insuranceProvider.address,
          "Insurance and Warranty Provider",
          "LIC-IWP-001",
          7
        )
    )
  );


  results.push(
    await executeAndMeasure(
      "Enroll Disposal Agency",
      entityEnrollment
        .connect(regulatoryAuthority)
        .enrollEntity(
          disposalAgency.address,
          "Disposal and Recycling Agency",
          "LIC-DRA-001",
          8
        )
    )
  );


  console.log(
    "Stakeholder entities enrolled."
  );


  // ==========================================================
  // 7. REGISTER MEDICAL EQUIPMENT
  // ==========================================================

  console.log(
    "\nRegistering medical equipment..."
  );

  const manufacturingDate =
    Math.floor(Date.now() / 1000) - 86400;

  const warrantyExpiry =
    manufacturingDate +
    (5 * 365 * 24 * 60 * 60);


  const registrationResult =
    await executeAndMeasure(
      "Register Equipment",

      equipmentRegistration
        .connect(manufacturer)
        .registerEquipment(
          "MRI-2026-0001",
          "Magnetic Resonance Imaging Scanner",
          "MRI-X500",
          "Diagnostic Imaging",
          "CERT-MRI-2026-001",
          "FW-1.0.0",
          manufacturingDate,
          warrantyExpiry
        )
    );

  results.push(registrationResult);


  const equipmentId =
    await equipmentRegistration
      .getEquipmentIdByIndex(1);


  console.log(
    "Equipment registered with ID:",
    equipmentId
  );


  // ==========================================================
  // 8. TRANSFER TO DISTRIBUTOR
  // ==========================================================

  console.log(
    "\nTransferring equipment to distributor..."
  );


  results.push(
    await executeAndMeasure(
      "Transfer to Distributor",

      ownershipShipment
        .connect(manufacturer)
        .transferEquipment(
          equipmentId,
          distributor.address,
          transporter.address,
          "SHIP-2026-001",
          "Authorized Distributor Warehouse"
        )
    )
  );


  console.log(
    "Equipment transferred to distributor."
  );


  // ==========================================================
  // 9. TRANSFER TO HOSPITAL
  // ==========================================================

  console.log(
    "Transferring equipment to hospital..."
  );


  results.push(
    await executeAndMeasure(
      "Transfer to Hospital",

      ownershipShipment
        .connect(distributor)
        .transferEquipment(
          equipmentId,
          hospital.address,
          transporter.address,
          "SHIP-2026-002",
          "Hospital Radiology Department"
        )
    )
  );


  console.log(
    "Equipment transferred to hospital."
  );


  // ==========================================================
  // 10. INSTALLATION AND CALIBRATION
  // ==========================================================

  console.log(
    "Installing and calibrating equipment..."
  );


  results.push(
    await executeAndMeasure(
      "Install and Calibrate Equipment",

      installationCalibration
        .connect(biomedicalEngineer)
        .installEquipment(
          equipmentId,
          hospital.address,
          "Radiology Department - Room 201",
          "CAL-MRI-2026-001",
          "FW-1.0.0",
          true,
          true,
          true
        )
    )
  );


  console.log(
    "Equipment installed and marked operational."
  );


  // ==========================================================
  // 11. MAINTENANCE
  // ==========================================================

  console.log(
    "Performing equipment maintenance..."
  );


  results.push(
    await executeAndMeasure(
      "Maintain Equipment",

      maintenanceComponent
        .connect(maintenanceProvider)
        .maintainEquipment(
          equipmentId,
          "Preventive Maintenance",
          "Routine inspection and performance verification",
          "COMP-MRI-001",
          "CAL-MRI-2026-002",
          true,
          true
        )
    )
  );


  console.log(
    "Maintenance completed successfully."
  );


  // ==========================================================
  // 12. RECALL
  // ==========================================================

  console.log(
    "Recalling equipment..."
  );


  results.push(
    await executeAndMeasure(
      "Recall Equipment",

      recallDisposal
        .connect(regulatoryAuthority)
        .recallEquipment(
          equipmentId,
          "Manufacturer safety notice"
        )
    )
  );


  // ==========================================================
  // 13. DECOMMISSION
  // ==========================================================

  console.log(
    "Decommissioning equipment..."
  );


  results.push(
    await executeAndMeasure(
      "Decommission Equipment",

      recallDisposal
        .connect(regulatoryAuthority)
        .decommissionEquipment(
          equipmentId
        )
    )
  );


  // ==========================================================
  // 14. DISPOSAL
  // ==========================================================

  console.log(
    "Disposing equipment..."
  );


  results.push(
    await executeAndMeasure(
      "Dispose Equipment",

      recallDisposal
        .connect(disposalAgency)
        .disposeEquipment(
          equipmentId,
          "Certified electronic recycling",
          "DISP-CERT-2026-001"
        )
    )
  );


  console.log(
    "\nEquipment lifecycle completed."
  );


  // ==========================================================
  // 15. SAVE BENCHMARK RESULTS
  // ==========================================================

  const resultsDirectory =
    path.join(
      __dirname,
      "..",
      "results"
    );


  if (!fs.existsSync(resultsDirectory)) {
    fs.mkdirSync(
      resultsDirectory,
      { recursive: true }
    );
  }


  const csvHeader =
    "Operation,TransactionHash,BlockNumber,GasUsed,LatencyMs,Status\n";


  const csvRows =
    results
      .map((row) =>
        [
          row.operation,
          row.transactionHash,
          row.blockNumber,
          row.gasUsed,
          row.latencyMs,
          row.status
        ].join(",")
      )
      .join("\n");


  const outputPath =
    path.join(
      resultsDirectory,
      `benchmark_results_besu_${Date.now()}.csv`
    );


  fs.writeFileSync(
    outputPath,
    csvHeader + csvRows
  );


  // ==========================================================
  // 16. DISPLAY RESULTS
  // ==========================================================

  console.table(
    results.map((row) => ({
      Operation: row.operation,
      GasUsed: row.gasUsed,
      LatencyMs: row.latencyMs,
      Status: row.status
    }))
  );


  console.log(
    "\nBenchmark results saved to:",
    outputPath
  );


  // ==========================================================
  // 17. NETWORK INFORMATION
  // ==========================================================

  const network =
    await ethers.provider.getNetwork();

  const blockNumber =
    await ethers.provider.getBlockNumber();

  console.log(
    "\nBesu QBFT Network Information"
  );

  console.log(
    "Chain ID:",
    network.chainId
  );

  console.log(
    "Final Block Number:",
    blockNumber
  );

  console.log(
    "Regulatory Authority:",
    baseRegulatoryAuthority.address
  );

  console.log(
    "Number of distinct stakeholder identities:",
    9
  );
}


// ============================================================
// Execute
// ============================================================

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });