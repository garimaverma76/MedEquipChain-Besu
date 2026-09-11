const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [regulatoryAuthority, manufacturer] =
    await ethers.getSigners();

  console.log("Deploying contracts...");

  // Deploy Entity Enrollment Contract
  const EntityEnrollment =
    await ethers.getContractFactory(
      "EntityEnrollmentContract"
    );

  const entityEnrollment =
    await EntityEnrollment.deploy();

  await entityEnrollment.deployed();

  // Deploy Equipment Registration Contract
  const EquipmentRegistration =
    await ethers.getContractFactory(
      "EquipmentRegistrationContract"
    );

  const equipmentRegistration =
    await EquipmentRegistration.deploy(
      entityEnrollment.address
    );

  await equipmentRegistration.deployed();

  // Register the manufacturer
  let transaction = await entityEnrollment
    .connect(regulatoryAuthority)
    .enrollEntity(
      manufacturer.address,
      "Scalability Test Manufacturer",
      "LIC-SCALE-EM-001",
      1
    );

  await transaction.wait();

  console.log("Manufacturer enrolled.");
  console.log("Starting scalability test...");

  const checkpoints = [100, 200, 400, 600, 800, 1000];

  const rawResults = [];
  const summaryResults = [];

  const manufacturingDate =
    Math.floor(Date.now() / 1000) - 86400;

  const warrantyExpiry =
    manufacturingDate + 5 * 365 * 24 * 60 * 60;

  let previousCheckpoint = 0;

  for (let recordNumber = 1;
       recordNumber <= 1000;
       recordNumber++) {

    const serialNumber =
      `MED-EQP-${String(recordNumber).padStart(5, "0")}`;

    const startTime = process.hrtime.bigint();

    const tx = await equipmentRegistration
      .connect(manufacturer)
      .registerEquipment(
        serialNumber,
        `Medical Equipment ${recordNumber}`,
        `MODEL-${String(recordNumber).padStart(5, "0")}`,
        "Diagnostic Equipment",
        `CERT-${String(recordNumber).padStart(5, "0")}`,
        "FW-1.0.0",
        manufacturingDate,
        warrantyExpiry
      );

    const receipt = await tx.wait();

    const endTime = process.hrtime.bigint();

    const latencyMs =
      Number(endTime - startTime) / 1_000_000;

    rawResults.push({
      recordNumber,
      gasUsed: Number(receipt.gasUsed.toString()),
      latencyMs,
      status: receipt.status
    });

    if (recordNumber % 50 === 0) {
      console.log(
        `${recordNumber} equipment records completed`
      );
    }

    if (checkpoints.includes(recordNumber)) {
      /*
       * Calculate the average for records added since
       * the previous checkpoint.
       *
       * Example:
       * checkpoint 100  -> records 1–100
       * checkpoint 200  -> records 101–200
       * checkpoint 400  -> records 201–400
       */
      const checkpointRecords = rawResults.filter(
        (row) =>
          row.recordNumber > previousCheckpoint &&
          row.recordNumber <= recordNumber
      );

      const averageGas =
        checkpointRecords.reduce(
          (sum, row) => sum + row.gasUsed,
          0
        ) / checkpointRecords.length;

      const averageLatency =
        checkpointRecords.reduce(
          (sum, row) => sum + row.latencyMs,
          0
        ) / checkpointRecords.length;

      const successfulTransactions =
        checkpointRecords.filter(
          (row) => row.status === 1
        ).length;

      const successRate =
        (successfulTransactions /
          checkpointRecords.length) * 100;

      summaryResults.push({
        totalRecords: recordNumber,
        recordsInInterval: checkpointRecords.length,
        averageGas,
        averageLatency,
        successRate
      });

      previousCheckpoint = recordNumber;
    }
  }

  const resultsDirectory = path.join(
    __dirname,
    "..",
    "results"
  );

  if (!fs.existsSync(resultsDirectory)) {
    fs.mkdirSync(resultsDirectory, {
      recursive: true
    });
  }

  // Save summarized scalability results
  const summaryHeader =
    "TotalRecords,RecordsInInterval,AverageGas," +
    "AverageLatencyMs,SuccessRate\n";

  const summaryRows = summaryResults
    .map((row) =>
      [
        row.totalRecords,
        row.recordsInInterval,
        row.averageGas.toFixed(2),
        row.averageLatency.toFixed(3),
        row.successRate.toFixed(2)
      ].join(",")
    )
    .join("\n");

  fs.writeFileSync(
    path.join(
      resultsDirectory,
      "scalability_results.csv"
    ),
    summaryHeader + summaryRows
  );

  // Save all 1,000 transaction results
  const rawHeader =
    "RecordNumber,GasUsed,LatencyMs,Status\n";

  const rawRows = rawResults
    .map((row) =>
      [
        row.recordNumber,
        row.gasUsed,
        row.latencyMs.toFixed(3),
        row.status
      ].join(",")
    )
    .join("\n");

  fs.writeFileSync(
    path.join(
      resultsDirectory,
      "scalability_raw_results.csv"
    ),
    rawHeader + rawRows
  );

  console.table(
    summaryResults.map((row) => ({
      TotalRecords: row.totalRecords,
      IntervalRecords: row.recordsInInterval,
      AverageGas: row.averageGas.toFixed(2),
      AverageLatencyMs:
        row.averageLatency.toFixed(3),
      SuccessRate:
        `${row.successRate.toFixed(2)}%`
    }))
  );

  console.log("\nScalability test completed.");
  console.log(
    "Summary saved to results/scalability_results.csv"
  );
  console.log(
    "Raw data saved to results/scalability_raw_results.csv"
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });