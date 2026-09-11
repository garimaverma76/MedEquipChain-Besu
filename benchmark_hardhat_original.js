const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

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
async function main() {

    const results = [];

    const [
        regulatoryAuthority,
        manufacturer,
        distributor,
        transporter,
        hospital,
        biomedicalEngineer,
        maintenanceProvider,
        insuranceProvider,
        disposalAgency
    ] = await ethers.getSigners();

    console.log("Deploying contracts...");
    // --------------------
// Deploy Entity Enrollment Contract
// --------------------
const EntityEnrollment =
    await ethers.getContractFactory("EntityEnrollmentContract");

const entityEnrollment =
    await EntityEnrollment.deploy();

await entityEnrollment.deployed();

// --------------------
// Deploy Equipment Registration Contract
// --------------------
const EquipmentRegistration =
    await ethers.getContractFactory("EquipmentRegistrationContract");

const equipmentRegistration =
    await EquipmentRegistration.deploy(
        entityEnrollment.address
    );

await equipmentRegistration.deployed();

// --------------------
// Deploy Ownership Shipment Contract
// --------------------
const OwnershipShipment =
    await ethers.getContractFactory("OwnershipShipmentContract");

const ownershipShipment =
    await OwnershipShipment.deploy(
        entityEnrollment.address,
        equipmentRegistration.address
    );

await ownershipShipment.deployed();

// --------------------
// Deploy Installation Calibration Contract
// --------------------
const InstallationCalibration =
    await ethers.getContractFactory("InstallationCalibrationContract");

const installationCalibration =
    await InstallationCalibration.deploy(
        entityEnrollment.address,
        equipmentRegistration.address
    );

await installationCalibration.deployed();

// --------------------
// Deploy Maintenance Component Contract
// --------------------
const MaintenanceComponent =
    await ethers.getContractFactory("MaintenanceComponentContract");

const maintenanceComponent =
    await MaintenanceComponent.deploy(
        entityEnrollment.address,
        equipmentRegistration.address
    );

await maintenanceComponent.deployed();

// --------------------
// Deploy Recall Disposal Contract
// --------------------
const RecallDisposal =
    await ethers.getContractFactory("RecallDisposalContract");

const recallDisposal =
    await RecallDisposal.deploy(
        entityEnrollment.address,
        equipmentRegistration.address
    );

await recallDisposal.deployed();

console.log("Contracts deployed successfully.");
console.log("Authorizing lifecycle contracts...");

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

console.log("Lifecycle contracts authorized.");
console.log("Enrolling stakeholder entities...");

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

console.log("Stakeholder entities enrolled.");
console.log("Registering medical equipment...");

const manufacturingDate =
  Math.floor(Date.now() / 1000) - 86400;

const warrantyExpiry =
  manufacturingDate + (5 * 365 * 24 * 60 * 60);

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
  await equipmentRegistration.getEquipmentIdByIndex(1);

console.log(
  "Equipment registered with ID:",
  equipmentId
);
console.log("Transferring equipment to distributor...");

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

console.log("Equipment transferred to distributor.");
console.log("Transferring equipment to hospital...");

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

console.log("Equipment transferred to hospital.");
console.log("Installing and calibrating equipment...");

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

console.log("Equipment installed and marked operational.");
console.log("Performing equipment maintenance...");

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

console.log("Maintenance completed successfully.");
console.log("Recalling equipment...");

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

console.log("Decommissioning equipment...");

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

console.log("Disposing equipment...");

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

console.log("Equipment lifecycle completed.");
const resultsDirectory = path.join(__dirname, "..", "results");

if (!fs.existsSync(resultsDirectory)) {
  fs.mkdirSync(resultsDirectory, { recursive: true });
}

const csvHeader =
  "Operation,TransactionHash,BlockNumber,GasUsed,LatencyMs,Status\n";

const csvRows = results
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

const outputPath = path.join(
  resultsDirectory,
  "benchmark_results.csv"
);

fs.writeFileSync(
  outputPath,
  csvHeader + csvRows
);

console.table(
  results.map((row) => ({
    Operation: row.operation,
    GasUsed: row.gasUsed,
    LatencyMs: row.latencyMs,
    Status: row.status
  }))
);

console.log(
  "Benchmark results saved to:",
  outputPath
);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });