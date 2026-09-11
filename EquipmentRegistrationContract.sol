// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IEntityEnrollmentContract {
    function isEntityActive(address walletAddress)
        external
        view
        returns (bool);

    function getEntityRole(address walletAddress)
        external
        view
        returns (uint8);

    function regulatoryAuthority()
        external
        view
        returns (address);
}

contract EquipmentRegistrationContract {
    enum EquipmentState {
        Manufactured,
        Registered,
        InTransit,
        Installed,
        Operational,
        UnderMaintenance,
        Recalled,
        Decommissioned,
        Disposed
    }

    struct Equipment {
        bytes32 equipmentId;
        string serialNumber;
        string equipmentName;
        string model;
        string category;
        string certificateNumber;
        string firmwareVersion;
        uint256 manufacturingDate;
        uint256 warrantyExpiry;
        address manufacturer;
        address currentOwner;
        uint256 registrationTime;
        bool isRegistered;
    }

    IEntityEnrollmentContract public entityContract;

    uint256 private equipmentCounter;

    mapping(bytes32 => Equipment) private equipmentRecords;
    mapping(bytes32 => EquipmentState) private equipmentStates;
    mapping(string => bool) private serialNumberExists;
    mapping(uint256 => bytes32) private equipmentIdByIndex;

    // OSC, ICC, MCC, and RDC will be authorized after deployment.
    mapping(address => bool) public authorizedLifecycleContracts;

    event EquipmentRegistered(
        bytes32 indexed equipmentId,
        string serialNumber,
        string equipmentName,
        string model,
        address indexed manufacturer,
        uint256 registrationTime
    );

    event OwnershipUpdated(
        bytes32 indexed equipmentId,
        address indexed previousOwner,
        address indexed newOwner,
        uint256 timestamp
    );

    event EquipmentStateUpdated(
        bytes32 indexed equipmentId,
        EquipmentState previousState,
        EquipmentState newState,
        address indexed updatedBy,
        uint256 timestamp
    );

    event LifecycleContractAuthorizationUpdated(
        address indexed contractAddress,
        bool authorized
    );

    constructor(address entityContractAddress) {
        require(
            entityContractAddress != address(0),
            "Invalid entity contract address."
        );

        entityContract =
            IEntityEnrollmentContract(entityContractAddress);
    }

    modifier onlyAuthorizedManufacturer() {
        require(
            entityContract.isEntityActive(msg.sender),
            "Manufacturer is not active."
        );

        require(
            entityContract.getEntityRole(msg.sender) == 1,
            "Only an Equipment Manufacturer can register equipment."
        );

        _;
    }

    modifier onlyRegulatoryAuthority() {
        require(
            msg.sender == entityContract.regulatoryAuthority(),
            "Only the Regulatory Authority can perform this action."
        );

        _;
    }

    modifier onlyAuthorizedLifecycleContract() {
        require(
            authorizedLifecycleContracts[msg.sender],
            "Caller is not an authorized lifecycle contract."
        );

        _;
    }

    function setAuthorizedLifecycleContract(
        address contractAddress,
        bool authorized
    )
        external
        onlyRegulatoryAuthority
    {
        require(
            contractAddress != address(0),
            "Invalid contract address."
        );

        authorizedLifecycleContracts[contractAddress] = authorized;

        emit LifecycleContractAuthorizationUpdated(
            contractAddress,
            authorized
        );
    }

    function registerEquipment(
        string memory serialNumber,
        string memory equipmentName,
        string memory model,
        string memory category,
        string memory certificateNumber,
        string memory firmwareVersion,
        uint256 manufacturingDate,
        uint256 warrantyExpiry
    )
        external
        onlyAuthorizedManufacturer
        returns (bytes32)
    {
        require(
            bytes(serialNumber).length > 0,
            "Serial number is required."
        );

        require(
            bytes(equipmentName).length > 0,
            "Equipment name is required."
        );

        require(
            bytes(model).length > 0,
            "Model is required."
        );

        require(
            bytes(category).length > 0,
            "Category is required."
        );

        require(
            bytes(certificateNumber).length > 0,
            "Certificate number is required."
        );

        require(
            bytes(firmwareVersion).length > 0,
            "Firmware version is required."
        );

        require(
            manufacturingDate > 0,
            "Invalid manufacturing date."
        );

        require(
            warrantyExpiry > manufacturingDate,
            "Warranty expiry must be after manufacturing date."
        );

        require(
            !serialNumberExists[serialNumber],
            "Serial number already exists."
        );

        bytes32 equipmentId = keccak256(
            abi.encodePacked(
                serialNumber,
                model,
                msg.sender,
                manufacturingDate
            )
        );

        require(
            !equipmentRecords[equipmentId].isRegistered,
            "Equipment already registered."
        );

        equipmentCounter++;

        equipmentRecords[equipmentId] = Equipment({
            equipmentId: equipmentId,
            serialNumber: serialNumber,
            equipmentName: equipmentName,
            model: model,
            category: category,
            certificateNumber: certificateNumber,
            firmwareVersion: firmwareVersion,
            manufacturingDate: manufacturingDate,
            warrantyExpiry: warrantyExpiry,
            manufacturer: msg.sender,
            currentOwner: msg.sender,
            registrationTime: block.timestamp,
            isRegistered: true
        });

        equipmentStates[equipmentId] =
            EquipmentState.Registered;

        serialNumberExists[serialNumber] = true;
        equipmentIdByIndex[equipmentCounter] = equipmentId;

        emit EquipmentRegistered(
            equipmentId,
            serialNumber,
            equipmentName,
            model,
            msg.sender,
            block.timestamp
        );

        return equipmentId;
    }

    function updateCurrentOwner(
        bytes32 equipmentId,
        address newOwner
    )
        external
        onlyAuthorizedLifecycleContract
    {
        require(
            equipmentRecords[equipmentId].isRegistered,
            "Equipment is not registered."
        );

        require(
            newOwner != address(0),
            "Invalid new owner address."
        );

        require(
            entityContract.isEntityActive(newOwner),
            "New owner is not an active entity."
        );

        address previousOwner =
            equipmentRecords[equipmentId].currentOwner;

        require(
            previousOwner != newOwner,
            "New owner is already the current owner."
        );

        equipmentRecords[equipmentId].currentOwner = newOwner;

        emit OwnershipUpdated(
            equipmentId,
            previousOwner,
            newOwner,
            block.timestamp
        );
    }

    function updateEquipmentState(
        bytes32 equipmentId,
        EquipmentState newState
    )
        external
        onlyAuthorizedLifecycleContract
    {
        require(
            equipmentRecords[equipmentId].isRegistered,
            "Equipment is not registered."
        );

        EquipmentState currentState =
            equipmentStates[equipmentId];

        require(
            isValidStateTransition(currentState, newState),
            "Invalid equipment lifecycle transition."
        );

        equipmentStates[equipmentId] = newState;

        emit EquipmentStateUpdated(
            equipmentId,
            currentState,
            newState,
            msg.sender,
            block.timestamp
        );
    }

    function isValidStateTransition(
        EquipmentState currentState,
        EquipmentState newState
    )
        public
        pure
        returns (bool)
    {
        if (
            currentState == EquipmentState.Registered &&
            newState == EquipmentState.InTransit
        ) {
            return true;
        }

        if (
            currentState == EquipmentState.InTransit &&
            (
                newState == EquipmentState.Registered ||
                newState == EquipmentState.Installed
            )
        ) {
            return true;
        }

        if (
            currentState == EquipmentState.Registered &&
            newState == EquipmentState.Installed
        ) {
            return true;
        }

        if (
            currentState == EquipmentState.Installed &&
            newState == EquipmentState.Operational
        ) {
            return true;
        }

        if (
            currentState == EquipmentState.Operational &&
            (
                newState == EquipmentState.UnderMaintenance ||
                newState == EquipmentState.Recalled ||
                newState == EquipmentState.Decommissioned
            )
        ) {
            return true;
        }

        if (
            currentState == EquipmentState.UnderMaintenance &&
            (
                newState == EquipmentState.Operational ||
                newState == EquipmentState.Recalled ||
                newState == EquipmentState.Decommissioned
            )
        ) {
            return true;
        }

        if (
            currentState == EquipmentState.Recalled &&
            (
                newState == EquipmentState.UnderMaintenance ||
                newState == EquipmentState.Decommissioned
            )
        ) {
            return true;
        }

        if (
            currentState == EquipmentState.Decommissioned &&
            newState == EquipmentState.Disposed
        ) {
            return true;
        }

        return false;
    }

    function getEquipment(bytes32 equipmentId)
        external
        view
        returns (Equipment memory)
    {
        require(
            equipmentRecords[equipmentId].isRegistered,
            "Equipment is not registered."
        );

        return equipmentRecords[equipmentId];
    }

    function getEquipmentState(bytes32 equipmentId)
        external
        view
        returns (EquipmentState)
    {
        require(
            equipmentRecords[equipmentId].isRegistered,
            "Equipment is not registered."
        );

        return equipmentStates[equipmentId];
    }

    function isEquipmentOperational(bytes32 equipmentId)
        external
        view
        returns (bool)
    {
        return
            equipmentRecords[equipmentId].isRegistered &&
            equipmentStates[equipmentId]
                == EquipmentState.Operational;
    }

    function isEquipmentRegistered(bytes32 equipmentId)
        external
        view
        returns (bool)
    {
        return equipmentRecords[equipmentId].isRegistered;
    }

    function getCurrentOwner(bytes32 equipmentId)
        external
        view
        returns (address)
    {
        require(
            equipmentRecords[equipmentId].isRegistered,
            "Equipment is not registered."
        );

        return equipmentRecords[equipmentId].currentOwner;
    }

    function getEquipmentCount()
        external
        view
        returns (uint256)
    {
        return equipmentCounter;
    }

    function getEquipmentIdByIndex(uint256 index)
        external
        view
        returns (bytes32)
    {
        require(
            index > 0 && index <= equipmentCounter,
            "Invalid equipment index."
        );

        return equipmentIdByIndex[index];
    }
}