const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Medical Equipment Supply Chain", function () {
  it("deploys all six contracts and authorizes lifecycle contracts", async function () {
    const [ra] = await ethers.getSigners();

    const EntityEnrollment =
      await ethers.getContractFactory("EntityEnrollmentContract");
    const entityEnrollment =
      await EntityEnrollment.deploy();
    await entityEnrollment.deployed();

    const EquipmentRegistration =
      await ethers.getContractFactory("EquipmentRegistrationContract");
    const equipmentRegistration =
      await EquipmentRegistration.deploy(entityEnrollment.address);
    await equipmentRegistration.deployed();

    const OwnershipShipment =
      await ethers.getContractFactory("OwnershipShipmentContract");
    const ownershipShipment =
      await OwnershipShipment.deploy(
        entityEnrollment.address,
        equipmentRegistration.address
      );
    await ownershipShipment.deployed();

    const InstallationCalibration =
      await ethers.getContractFactory("InstallationCalibrationContract");
    const installationCalibration =
      await InstallationCalibration.deploy(
        entityEnrollment.address,
        equipmentRegistration.address
      );
    await installationCalibration.deployed();

    const MaintenanceComponent =
      await ethers.getContractFactory("MaintenanceComponentContract");
    const maintenanceComponent =
      await MaintenanceComponent.deploy(
        entityEnrollment.address,
        equipmentRegistration.address
      );
    await maintenanceComponent.deployed();

    const RecallDisposal =
      await ethers.getContractFactory("RecallDisposalContract");
    const recallDisposal =
      await RecallDisposal.deploy(
        entityEnrollment.address,
        equipmentRegistration.address
      );
    await recallDisposal.deployed();

    await (
      await equipmentRegistration.setAuthorizedLifecycleContract(
        ownershipShipment.address,
        true
      )
    ).wait();

    await (
      await equipmentRegistration.setAuthorizedLifecycleContract(
        installationCalibration.address,
        true
      )
    ).wait();

    await (
      await equipmentRegistration.setAuthorizedLifecycleContract(
        maintenanceComponent.address,
        true
      )
    ).wait();

    await (
      await equipmentRegistration.setAuthorizedLifecycleContract(
        recallDisposal.address,
        true
      )
    ).wait();

    expect(await entityEnrollment.regulatoryAuthority())
      .to.equal(ra.address);

    expect(
      await equipmentRegistration.authorizedLifecycleContracts(
        ownershipShipment.address
      )
    ).to.equal(true);

    expect(
      await equipmentRegistration.authorizedLifecycleContracts(
        installationCalibration.address
      )
    ).to.equal(true);

    expect(
      await equipmentRegistration.authorizedLifecycleContracts(
        maintenanceComponent.address
      )
    ).to.equal(true);

    expect(
      await equipmentRegistration.authorizedLifecycleContracts(
        recallDisposal.address
      )
    ).to.equal(true);
  });
});