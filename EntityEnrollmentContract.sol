// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract EntityEnrollmentContract {
    struct Entity {
        uint256 entityId;
        address walletAddress;
        string entityName;
        string licenseNumber;
        uint8 role;
        uint256 registrationTime;
        bool isActive;
    }

    address public regulatoryAuthority;
    uint256 private entityCounter;

    mapping(address => Entity) private entities;
    mapping(uint256 => address) private entityAddressById;

    event EntityEnrolled(
        uint256 indexed entityId,
        address indexed walletAddress,
        string entityName,
        string licenseNumber,
        uint8 role,
        uint256 registrationTime
    );

    event EntitySuspended(
        uint256 indexed entityId,
        address indexed walletAddress,
        uint256 timestamp
    );

    event EntityReactivated(
        uint256 indexed entityId,
        address indexed walletAddress,
        uint256 timestamp
    );

    constructor() {
        regulatoryAuthority = msg.sender;
    }

    modifier onlyRegulatoryAuthority() {
        require(
            msg.sender == regulatoryAuthority,
            "Only the Regulatory Authority can perform this action."
        );
        _;
    }

    function enrollEntity(
        address walletAddress,
        string memory entityName,
        string memory licenseNumber,
        uint8 role
    )
        external
        onlyRegulatoryAuthority
        returns (uint256)
    {
        require(walletAddress != address(0), "Invalid wallet address.");
        require(bytes(entityName).length > 0, "Entity name is required.");
        require(bytes(licenseNumber).length > 0, "License number is required.");
        require(role >= 1 && role <= 8, "Invalid entity role.");
        require(
            entities[walletAddress].registrationTime == 0,
            "Entity is already enrolled."
        );

        entityCounter++;

        entities[walletAddress] = Entity({
            entityId: entityCounter,
            walletAddress: walletAddress,
            entityName: entityName,
            licenseNumber: licenseNumber,
            role: role,
            registrationTime: block.timestamp,
            isActive: true
        });

        entityAddressById[entityCounter] = walletAddress;

        emit EntityEnrolled(
            entityCounter,
            walletAddress,
            entityName,
            licenseNumber,
            role,
            block.timestamp
        );

        return entityCounter;
    }

    function getEntity(address walletAddress)
        external
        view
        returns (
            uint256 entityId,
            address entityWallet,
            string memory entityName,
            string memory licenseNumber,
            uint8 role,
            uint256 registrationTime,
            bool isActive
        )
    {
        require(
            entities[walletAddress].registrationTime != 0,
            "Entity is not enrolled."
        );

        Entity memory entity = entities[walletAddress];

        return (
            entity.entityId,
            entity.walletAddress,
            entity.entityName,
            entity.licenseNumber,
            entity.role,
            entity.registrationTime,
            entity.isActive
        );
    }

    function getEntityById(uint256 entityId)
        external
        view
        returns (
            uint256 id,
            address walletAddress,
            string memory entityName,
            string memory licenseNumber,
            uint8 role,
            uint256 registrationTime,
            bool isActive
        )
    {
        require(
            entityId > 0 && entityId <= entityCounter,
            "Invalid entity ID."
        );

        address entityWallet = entityAddressById[entityId];
        Entity memory entity = entities[entityWallet];

        return (
            entity.entityId,
            entity.walletAddress,
            entity.entityName,
            entity.licenseNumber,
            entity.role,
            entity.registrationTime,
            entity.isActive
        );
    }

    function isEntityActive(address walletAddress)
        external
        view
        returns (bool)
    {
        return entities[walletAddress].isActive;
    }

    function getEntityRole(address walletAddress)
        external
        view
        returns (uint8)
    {
        require(
            entities[walletAddress].registrationTime != 0,
            "Entity is not enrolled."
        );

        return entities[walletAddress].role;
    }

    function getEntityCount()
        external
        view
        returns (uint256)
    {
        return entityCounter;
    }

    function suspendEntity(address walletAddress)
        external
        onlyRegulatoryAuthority
    {
        require(
            entities[walletAddress].registrationTime != 0,
            "Entity is not enrolled."
        );
        require(
            entities[walletAddress].isActive,
            "Entity is already inactive."
        );

        entities[walletAddress].isActive = false;

        emit EntitySuspended(
            entities[walletAddress].entityId,
            walletAddress,
            block.timestamp
        );
    }

    function reactivateEntity(address walletAddress)
        external
        onlyRegulatoryAuthority
    {
        require(
            entities[walletAddress].registrationTime != 0,
            "Entity is not enrolled."
        );
        require(
            !entities[walletAddress].isActive,
            "Entity is already active."
        );

        entities[walletAddress].isActive = true;

        emit EntityReactivated(
            entities[walletAddress].entityId,
            walletAddress,
            block.timestamp
        );
    }
}