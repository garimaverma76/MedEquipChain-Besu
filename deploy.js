const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with account:");
  console.log(deployer.address);

  const EntityEnrollment =
    await ethers.getContractFactory(
      "EntityEnrollmentContract"
    );

  const entityEnrollment =
    await EntityEnrollment.deploy();

  await entityEnrollment.deployed();

  console.log(
    "EntityEnrollmentContract:",
    entityEnrollment.address
  );

  const EquipmentRegistration =
    await ethers.getContractFactory(
      "EquipmentRegistrationContract"
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

  const OwnershipShipment =
    await ethers.getContractFactory(
      "OwnershipShipmentContract"
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

  const InstallationCalibration =
    await ethers.getContractFactory(
      "InstallationCalibrationContract"
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

  const MaintenanceComponent =
    await ethers.getContractFactory(
      "MaintenanceComponentContract"
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

  const RecallDisposal =
    await ethers.getContractFactory(
      "RecallDisposalContract"
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

  console.log("\nAuthorizing lifecycle contracts...");

  let tx =
    await equipmentRegistration
      .setAuthorizedLifecycleContract(
        ownershipShipment.address,
        true
      );

  await tx.wait();

  tx =
    await equipmentRegistration
      .setAuthorizedLifecycleContract(
        installationCalibration.address,
        true
      );

  await tx.wait();

  tx =
    await equipmentRegistration
      .setAuthorizedLifecycleContract(
        maintenanceComponent.address,
        true
      );

  await tx.wait();

  tx =
    await equipmentRegistration
      .setAuthorizedLifecycleContract(
        recallDisposal.address,
        true
      );

  await tx.wait();

  console.log("All lifecycle contracts authorized.");
  console.log("\nDeployment completed successfully.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });