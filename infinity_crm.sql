-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: infinity_crm
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `app_migrations`
--

DROP TABLE IF EXISTS `app_migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `app_migrations` (
  `name` varchar(120) NOT NULL,
  `applied_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `app_migrations`
--

LOCK TABLES `app_migrations` WRITE;
/*!40000 ALTER TABLE `app_migrations` DISABLE KEYS */;
INSERT INTO `app_migrations` VALUES ('2026-10-18-admin-own-invoices','2026-10-17 19:46:09.149'),('2026-10-18-invoices-created-by-backfill','2026-10-17 18:39:36.196'),('2026-10-18-supervisor-own-invoices','2026-10-17 18:39:36.207');
/*!40000 ALTER TABLE `app_migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `company_settings`
--

DROP TABLE IF EXISTS `company_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `company_settings` (
  `id` int(10) unsigned NOT NULL,
  `company_name` varchar(255) NOT NULL,
  `address` text DEFAULT NULL,
  `tel` varchar(50) DEFAULT NULL,
  `mobile` varchar(50) DEFAULT NULL,
  `email` varchar(190) DEFAULT NULL,
  `website` varchar(190) DEFAULT NULL,
  `contact_no` varchar(50) DEFAULT NULL,
  `uen` varchar(50) DEFAULT NULL,
  `default_currency` varchar(10) NOT NULL DEFAULT 'SGD',
  `created_at` datetime(3) DEFAULT NULL,
  `updated_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `company_settings`
--

LOCK TABLES `company_settings` WRITE;
/*!40000 ALTER TABLE `company_settings` DISABLE KEYS */;
INSERT INTO `company_settings` VALUES (1,'Chola Logistics Pte Ltd','Blk-640, Rowell Road, #01-54, Singapore 200640','+65 62917747','+65 90144400','accounts@permitdeclaration.com.sg','www.permitdeclaration.com.sg','+65 96539713','201835067C','SGD','2026-09-14 15:33:47.961','2026-10-17 19:47:48.974');
/*!40000 ALTER TABLE `company_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customers`
--

DROP TABLE IF EXISTS `customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `customers` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `companyname` varchar(255) NOT NULL,
  `person_incharge` varchar(150) DEFAULT NULL,
  `mobile_no` varchar(50) DEFAULT NULL,
  `email` varchar(190) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `created_at` datetime(3) DEFAULT NULL,
  `updated_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_customers_name` (`companyname`),
  KEY `idx_customers_created` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customers`
--

LOCK TABLES `customers` WRITE;
/*!40000 ALTER TABLE `customers` DISABLE KEYS */;
INSERT INTO `customers` VALUES (3,'APPAREL WORKS','ADRIAN','+65-98433879','adrian@apparelworkz.com.sg','BLK 259, #11-342 TAMPINES STREET 21 \nSingapore 520259','2026-09-29 20:17:56.824','2026-09-29 20:17:56.824'),(4,'CXL MARINE & LOGISTICS CO PTE. LTD','Mr Louis Woo','+65 9837 1616','louis@c-xpress.com','60 PAYA LEBAR ROAD, \n#13-25 PAYA LEBAR SQUARE, \nSingapore 409051','2026-09-29 20:18:22.204','2026-09-29 20:18:22.204'),(5,'DIRECT HARVEST COMPANY PTE. LTD','Mr. Kenny N','+65 9389 5531',NULL,'20 Chia Ping Road Singapore 619974','2026-09-29 20:18:38.665','2026-09-29 20:18:38.665'),(6,'GRACE FIRE PTE. LTD.','Ms Yan Yan','+65 6484 3515','gracefiresafety@singnet.com.sg','50 Tuas Ave 11, #01-35 \nSingapore 639107','2026-09-29 20:19:02.512','2026-09-29 20:19:02.512'),(7,'Mayson Shipping (S) Pte. Ltd','Ms.Kenzie','+65 6970 9005','sales@maysonship.com','18 Boon Lay Way \nSingapore 609966','2026-09-29 20:19:21.776','2026-09-29 20:19:21.776'),(8,'SUMBER INDAH PTE LTD','Prem rai','+65 9169 4214','shipping1@sumber.com.sg','1 NORTH BRIDGE ROAD, \n#01-08, HIGH STREET CENTER, \nSingapore 179094','2026-09-29 20:20:01.561','2026-09-29 20:20:01.561'),(9,'TANDEM GLOBAL LOGISTICS SINGAPORE PTE. LTD','Mr. Douglas Kang','+65 6298 0831','sg-sin@tandemgloballogistics.com.sg','6001, Beach Road, #18-08, \nGolden Mile Tower, Singapore 199589','2026-09-29 20:20:28.601','2026-09-29 20:20:28.601'),(10,'GUUD PTE. LTD.','ALLEN CHAN','+65 6779 6218',NULL,'8 Aljunied Ave 3, \nSingapore 389933','2026-10-01 09:07:56.135','2026-10-06 11:05:11.150'),(11,'Mercury Men Pte Ltd',NULL,NULL,NULL,NULL,'2026-10-03 11:32:56.031','2026-10-03 11:32:56.031'),(12,'TAY’S LOGISTICS PTE LTD','Ms Linda','+65 8851 9343','logisticstay@gmail.com','515, Woodlands drive 14, #05-145, \nSingapore 730515','2026-10-03 16:58:44.527','2026-10-03 16:58:44.527'),(13,'Truelog Pte Ltd','Ms Helen','+65 8896 1609',NULL,'101 Cecil St, #11-05 \nSingapore 69533','2026-10-03 17:00:22.675','2026-10-03 17:00:22.675'),(14,'WANZHOU TRADING (ASIA) PTE. LTD.','Ms Sofine','+85 2868 2828',NULL,'9 RAFFLES PLACE, #26-01 REPUBLIC PLAZA, \nSINGAPORE 48619','2026-10-03 17:00:52.514','2026-10-03 17:00:52.514'),(15,'W FOOD PROCESSOR PTE LTD','Ms Anna','+65 8369 2942',NULL,'21 Duxton Hill #01-01 \nSingapore 89604','2026-10-03 17:02:32.727','2026-10-03 17:02:32.727'),(16,'PERSONAL CUSTOMER','PERSONAL',NULL,NULL,'XXXX XXXX SINGAPORE / MALAYSIA','2026-10-03 17:04:07.373','2026-10-03 17:04:07.373');
/*!40000 ALTER TABLE `customers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `invoice_items`
--

DROP TABLE IF EXISTS `invoice_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `invoice_items` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `invoice_id` int(10) unsigned NOT NULL,
  `product_id` int(10) unsigned NOT NULL DEFAULT 0,
  `description` text DEFAULT NULL,
  `rate` decimal(14,2) NOT NULL DEFAULT 0.00,
  `quantity` decimal(14,2) NOT NULL DEFAULT 1.00,
  `total` decimal(14,2) NOT NULL DEFAULT 0.00,
  `created_at` datetime(3) DEFAULT NULL,
  `updated_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_items_invoice` (`invoice_id`),
  KEY `idx_items_product` (`product_id`)
) ENGINE=InnoDB AUTO_INCREMENT=119 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `invoice_items`
--

LOCK TABLES `invoice_items` WRITE;
/*!40000 ALTER TABLE `invoice_items` DISABLE KEYS */;
INSERT INTO `invoice_items` VALUES (47,15,3,'OD6I271011C,OD6I770346I\n',15.00,2.00,30.00,'2026-09-29 20:22:45.024','2026-09-29 20:22:45.024'),(48,15,2,'IG6I205817H,IG6I205928F\n',15.00,2.00,30.00,'2026-09-29 20:22:45.024','2026-09-29 20:22:45.024'),(49,16,1,'SAHBSAB',150.00,1.00,150.00,'2026-09-29 20:30:25.592','2026-09-29 20:30:25.592'),(50,17,2,'ABSHABS',15.00,1.00,15.00,'2026-09-29 20:30:39.756','2026-09-29 20:30:39.756'),(51,18,2,'IG6I205817H\nIG6I205817H\nIG6I205817H\nIG6I205817H\nIG6I205817H\nIG6I205817H\nIG6I205817H\nIG6I205817H\nIG6I205817H\n',15.00,9.00,135.00,'2026-09-29 20:41:32.437','2026-09-29 20:41:32.437'),(52,19,3,'ME6H484507D IG6H930579T IG6H930656I IG6H930726C IG6H944217H IG6H955488F\nME6H498394J IG6H969823T IG6H957451N IG6H957674Z IG6H959013X IG6H968681H\nIG6H969649G IG6H972094C IG6H986655W IG6H009421B ME6H519765F IG6H009379J\nIG6H022368Q ME6H521752U\n',15.00,30.00,450.00,'2026-09-29 20:43:22.384','2026-09-29 20:43:22.384'),(93,26,16,'FREIGHT CHARGES /IN\n(162 RS - PER KG 2.16 X 388 KG)',838.08,1.00,838.08,'2026-10-03 11:32:56.066','2026-10-03 11:32:56.066'),(94,26,17,'IN HOUSE CUSTOMS\nAGENT\n(8500 RS) UNIT COST\n113.35 $ / IN ',113.35,1.00,113.35,'2026-10-03 11:32:56.066','2026-10-03 11:32:56.066'),(95,26,1,'GST  18% FOR FREIGHT /IN',171.25,1.00,171.25,'2026-10-03 11:32:56.066','2026-10-03 11:32:56.066'),(96,26,18,'CARGO CLEARANCE PERMIT  CHARGES / SG',25.00,1.00,25.00,'2026-10-03 11:32:56.066','2026-10-03 11:32:56.066'),(97,26,1,'GST 9 % FOR SINGAPORE CUSTOMS',221.70,1.00,221.70,'2026-10-03 11:32:56.066','2026-10-03 11:32:56.066'),(98,26,19,'TRANSPORTATION /  SG ',180.00,1.00,180.00,'2026-10-03 11:32:56.066','2026-10-03 11:32:56.066'),(99,26,20,'SATS/ NETS PAYMENT / SG',20.00,1.00,20.00,'2026-10-03 11:32:56.066','2026-10-03 11:32:56.066'),(100,26,21,'TERMINAL HANDLING\nCHARGES 0.10 CENTS\nPER KG / SG',0.10,388.00,38.80,'2026-10-03 11:32:56.066','2026-10-03 11:32:56.066'),(101,26,22,'USING CHOLA LOGISTICS PTE. LTD AS IOR',40.00,1.00,40.00,'2026-10-03 11:32:56.066','2026-10-03 11:32:56.066'),(111,25,9,'STAFF SALARY AS PER ANNEXURE A',16109.76,1.00,16109.76,'2026-10-06 11:20:32.139','2026-10-06 11:20:32.139'),(112,25,10,'STAFF MEALS AND BEVERAGES',660.48,1.00,660.48,'2026-10-06 11:20:32.139','2026-10-06 11:20:32.139'),(113,25,12,'LAPTOP RENTALS',35.00,21.00,735.00,'2026-10-06 11:20:32.139','2026-10-06 11:20:32.139'),(114,25,13,'SETUP FEE',6000.00,1.00,6000.00,'2026-10-06 11:20:32.139','2026-10-06 11:20:32.139'),(115,25,14,'STAFF OVERTIME CHARGES AS ANNEXURE B',2490.65,1.00,2490.65,'2026-10-06 11:20:32.139','2026-10-06 11:20:32.139'),(116,25,15,'PART TIME WORKER CHARGES ANNEXURE B',2022.41,1.00,2022.41,'2026-10-06 11:20:32.139','2026-10-06 11:20:32.139'),(117,25,11,'TELEGRAPHIC TRANSFER',32.00,1.00,32.00,'2026-10-06 11:20:32.139','2026-10-06 11:20:32.139'),(118,27,23,'JOINING BONUS AS PER ANNEXURE C',21651.82,1.00,21651.82,'2026-10-06 11:21:57.162','2026-10-06 11:21:57.162');
/*!40000 ALTER TABLE `invoice_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `invoices`
--

DROP TABLE IF EXISTS `invoices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `invoices` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `invoice_no` varchar(50) NOT NULL,
  `invoice_date` date DEFAULT NULL,
  `customer_id` int(10) unsigned DEFAULT NULL,
  `customer_contact` varchar(50) DEFAULT NULL,
  `sub_amount` decimal(14,2) NOT NULL DEFAULT 0.00,
  `paid_amount` decimal(14,2) NOT NULL DEFAULT 0.00,
  `due_amount` decimal(14,2) NOT NULL DEFAULT 0.00,
  `payment_type` varchar(50) DEFAULT NULL,
  `payment_status` varchar(50) DEFAULT NULL,
  `status` varchar(30) NOT NULL DEFAULT 'Unpaid',
  `is_gst_bill` tinyint(1) NOT NULL DEFAULT 0,
  `is_gst_only` tinyint(1) DEFAULT NULL,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime(3) DEFAULT NULL,
  `version` int(10) unsigned NOT NULL DEFAULT 0,
  `created_at` datetime(3) DEFAULT NULL,
  `updated_at` datetime(3) DEFAULT NULL,
  `created_by` int(10) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_invoices_no` (`invoice_no`),
  KEY `idx_invoices_customer` (`customer_id`),
  KEY `idx_invoices_list` (`is_deleted`,`invoice_date`,`id`),
  KEY `idx_invoices_status` (`is_deleted`,`status`),
  KEY `idx_invoices_payment` (`is_deleted`,`payment_status`),
  KEY `idx_invoices_trash` (`is_deleted`,`deleted_at`),
  KEY `idx_invoices_owner` (`created_by`)
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `invoices`
--

LOCK TABLES `invoices` WRITE;
/*!40000 ALTER TABLE `invoices` DISABLE KEYS */;
INSERT INTO `invoices` VALUES (15,'20260929-109','2026-09-29',3,'+65-98433879',60.00,0.00,60.00,NULL,'Due','Unpaid',0,0,1,'2026-10-01 09:05:39.456',0,'2026-09-29 20:22:45.024','2026-10-01 09:05:39.456',1),(16,'20260929-110','2026-09-29',3,'+65-98433879',150.00,0.00,150.00,NULL,'Due','Unpaid',1,1,1,'2026-10-01 09:05:37.271',0,'2026-09-29 20:30:25.592','2026-10-01 09:05:37.271',1),(17,'20260929-111','2026-09-29',3,'+65-98433879',15.00,0.00,15.00,NULL,'Due','Unpaid',0,0,1,'2026-10-01 09:05:34.364',0,'2026-09-29 20:30:39.756','2026-10-01 09:05:34.364',1),(18,'20260929-112','2026-09-29',4,'+65 9837 1616',135.00,0.00,135.00,NULL,'Due','Unpaid',0,0,1,'2026-10-01 09:05:31.469',0,'2026-09-29 20:41:32.437','2026-10-01 09:05:31.469',1),(19,'20260929-113','2026-09-29',8,'+65 9169 4214',450.00,0.00,450.00,NULL,'Due','Unpaid',0,0,1,'2026-10-01 09:05:29.147',0,'2026-09-29 20:43:22.384','2026-10-01 09:05:29.147',1),(25,'20261001-114','2026-10-01',10,'+65 6779 6218',28050.30,0.00,28050.30,NULL,'Due','Unpaid',0,0,0,NULL,6,'2026-10-01 11:04:40.523','2026-10-06 11:20:32.139',1),(26,'20261003-115','2026-10-03',11,NULL,1648.18,0.00,1648.18,NULL,'Due','Unpaid',1,0,0,NULL,0,'2026-10-03 11:32:56.066','2026-10-03 11:32:56.066',1),(27,'20261005-116','2026-10-05',10,'+65 6779 6218',21651.82,0.00,21651.82,NULL,'Due','Unpaid',0,0,0,NULL,2,'2026-10-05 09:46:17.090','2026-10-06 11:21:57.162',1);
/*!40000 ALTER TABLE `invoices` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `permissions`
--

DROP TABLE IF EXISTS `permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `permissions` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(100) NOT NULL,
  `module` varchar(50) NOT NULL,
  `action` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_permissions_code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=765 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `permissions`
--

LOCK TABLES `permissions` WRITE;
/*!40000 ALTER TABLE `permissions` DISABLE KEYS */;
INSERT INTO `permissions` VALUES (1,'customers.view','customers','view'),(2,'customers.create','customers','create'),(3,'customers.edit','customers','edit'),(4,'customers.delete','customers','delete'),(5,'products.view','products','view'),(6,'products.create','products','create'),(7,'products.edit','products','edit'),(8,'products.delete','products','delete'),(9,'invoices.view','invoices','view'),(10,'invoices.create','invoices','create'),(11,'invoices.edit','invoices','edit'),(12,'invoices.delete','invoices','delete'),(13,'invoices.print','invoices','print'),(14,'reports.view','reports','view'),(15,'reports.export','reports','export'),(16,'users.manage','users','manage'),(17,'roles.manage','roles','manage'),(18,'settings.manage','settings','manage'),(19,'dashboard.view','dashboard','view'),(20,'quotations.view','quotations','view'),(21,'quotations.create','quotations','create'),(22,'quotations.edit','quotations','edit'),(23,'quotations.delete','quotations','delete'),(24,'quotations.print','quotations','print'),(25,'gst_invoices.view','gst_invoices','view'),(26,'gst_invoices.create','gst_invoices','create'),(27,'gst_invoices.edit','gst_invoices','edit'),(28,'gst_invoices.delete','gst_invoices','delete'),(29,'gst_invoices.print','gst_invoices','print'),(494,'invoices.view_all','invoices','view_all');
/*!40000 ALTER TABLE `permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `products` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `productname` varchar(255) NOT NULL,
  `created_at` datetime(3) DEFAULT NULL,
  `updated_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_products_name` (`productname`)
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products`
--

LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
INSERT INTO `products` VALUES (1,'GST','2026-09-14 15:33:47.664','2026-09-18 09:32:51.739'),(2,'IMPORT DECLARATION','2026-09-14 15:33:47.699',NULL),(3,'EXPORT DECLARATION','2026-09-14 15:33:47.736',NULL),(4,'CANCELLATION','2026-09-14 15:33:47.770',NULL),(5,'CARGO CLEARANCE AND TRANSPORTATION','2026-09-14 15:33:47.812',NULL),(6,'ITEM COST','2026-09-14 15:33:47.849',NULL),(7,'IMPORTER OF THE RECORD (USING CHOLA AS IMPORTER)','2026-09-14 15:33:47.883',NULL),(8,'LICENSE (USING CHOLA LICENSE)','2026-09-14 15:33:47.918',NULL),(9,'SALARY','2026-10-01 11:04:40.497',NULL),(10,'ALLOWANCES','2026-10-01 11:04:40.497',NULL),(11,'BANK CHARGES','2026-10-01 11:04:40.497',NULL),(12,'RENTAL','2026-10-01 11:04:40.497',NULL),(13,'ADMIN','2026-10-01 11:04:40.497',NULL),(14,'OT CHARGES','2026-10-02 08:22:00.853',NULL),(15,'PART TIMERS','2026-10-02 08:22:00.853',NULL),(16,'FREIGHT','2026-10-03 11:32:56.048',NULL),(17,'DOCUMENTATION/ INDIA','2026-10-03 11:32:56.048',NULL),(18,'PERMIT CHARGES','2026-10-03 11:32:56.048',NULL),(19,'TRANSPORT','2026-10-03 11:32:56.048',NULL),(20,'PORT CHARGES','2026-10-03 11:32:56.048',NULL),(21,'TERMINAL HANDLING CHARGES','2026-10-03 11:32:56.048',NULL),(22,'IMPORTER OF RECORD','2026-10-03 11:32:56.048',NULL),(23,'JOINING BONUS','2026-10-05 09:46:17.059',NULL);
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `quotations`
--

DROP TABLE IF EXISTS `quotations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `quotations` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `quotation_no` varchar(50) NOT NULL,
  `customer_id` int(10) unsigned DEFAULT NULL,
  `companyname` varchar(255) NOT NULL,
  `address` text DEFAULT NULL,
  `person_incharge` varchar(150) DEFAULT NULL,
  `mobile_no` varchar(50) DEFAULT NULL,
  `customer_contact` varchar(50) DEFAULT NULL,
  `quotation_date` date DEFAULT NULL,
  `items` longtext DEFAULT NULL,
  `sub_amount` decimal(14,2) NOT NULL DEFAULT 0.00,
  `notes` text DEFAULT NULL,
  `doc_title` varchar(255) DEFAULT NULL,
  `item_cost` text DEFAULT NULL,
  `turnaround` longtext DEFAULT NULL,
  `procedures` text DEFAULT NULL,
  `operating_hours` text DEFAULT NULL,
  `terms` longtext DEFAULT NULL,
  `closing_note` text DEFAULT NULL,
  `visibility` text DEFAULT NULL,
  `created_at` datetime(3) DEFAULT NULL,
  `updated_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_quotations_no` (`quotation_no`),
  KEY `idx_quotations_customer` (`customer_id`),
  KEY `idx_quotations_date` (`quotation_date`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `quotations`
--

LOCK TABLES `quotations` WRITE;
/*!40000 ALTER TABLE `quotations` DISABLE KEYS */;
INSERT INTO `quotations` VALUES (2,'Q-0926-0001',2,'zone','lfhfl','','123456789','123456789','2026-09-24','[{\"product_id\":7,\"productname\":\"IMPORTER OF THE RECORD (USING CHOLA AS IMPORTER)\",\"description\":\"1111ddddd\",\"rate\":10,\"quantity\":1,\"total\":10},{\"product_id\":7,\"productname\":\"IMPORTER OF THE RECORD (USING CHOLA AS IMPORTER)\",\"description\":\"ffsdsd\",\"rate\":11,\"quantity\":1,\"total\":11}]',21.00,'','OFFICIAL QUOTATION FOR PERMIT DECLARATIONS','1st to 10th items No Charges\nFrom 11th items onwards additional charge SGD 0.50 Cents per line item','[{\"priority\":\"Normal Requests\",\"timing\":\"Within 2hrs from time of Request\"},{\"priority\":\"Urgent Requests\",\"timing\":\"Within 60mins of Request\"},{\"priority\":\"Super Urgent Requests\",\"timing\":\"Within 30 mins of Request\"},{\"priority\":\"Tier1/Control countries/Other Controlling Agencies\",\"timing\":\"Depending upon the Customs queue\"}]','To facilitate the customs permit application, kindly provide the following documents:\n.  BL COPY / AWB COPY / Commercial Invoice / Packing List / NOA / BKG Form\nSend Your Permit Request To Our Ops Team : Email: accounts@permitdeclaration.com.sg\nUpon receipt of the required documents, our ops team will process your permit application promptly. Approved permit(s) will be forwarded to your email upon successful approval by Singapore Customs.','24 Hours | 7 Days a Week | Including Public Holidays at NO EXTRA COST\nWe provide 24/7 Customs Permit Declaration Services to support your import and export operations at any time.\n24/7 Assistance WhatsApp / Contact: +65 90144400\nExpress Permit Processing : Additional SGD 10.00 per permit.','[\"Payment for Declaration services shall be made within 7 days from the invoice date.\",\"Under our GIRO arrangement with Singapore Customs, all applicable GST, Customs Duties, and Government charges are deducted directly from our company\'s GIRO account.\",\"Customers are required to transfer the applicable GST and DUTY charges to our company\'s designated UOB bank account before permit submission and approval.\",\"Permit application will be processed for approval only after the GST payment has been received.\",\"Additional charges may apply for permit amendments, cancellations, controlled goods, licence applications, or other special customs requirements.\",\"Unless otherwise stated, this quotation is valid for 10 days from the date of issue.\"]','Thank you for choosing Chola Logistics Pte Ltd Permit Declaration Services. We look forward to serving you with fast, reliable, and professional support 24/7.',NULL,'2026-09-24 18:04:30.788','2026-09-29 09:24:06.081'),(4,'Q-0926-0002',NULL,'ABCDE PTE LTD','AJSAIJBS SINGAPORE 689878','','+65 90144400','+65 90144400','2026-09-29','[{\"product_id\":3,\"productname\":\"EXPORT DECLARATION\",\"description\":\"\",\"rate\":0,\"quantity\":1,\"total\":0},{\"product_id\":2,\"productname\":\"IMPORT DECLARATION\",\"description\":\"\",\"rate\":0,\"quantity\":1,\"total\":0},{\"product_id\":7,\"productname\":\"IMPORTER OF THE RECORD (USING CHOLA AS IMPORTER)\",\"description\":\"\",\"rate\":0,\"quantity\":1,\"total\":0}]',0.00,'','OFFICIAL QUOTATION FOR PERMIT DECLARATIONS','1st to 5th items No Charges\nFrom 5th items onwards additional charge SGD 0.50 Cents per line item','[{\"priority\":\"Normal Requests\",\"timing\":\"Within 2hrs from time of Request\"},{\"priority\":\"Urgent Requests\",\"timing\":\"Within 60mins of Request\"},{\"priority\":\"Super Urgent Requests\",\"timing\":\"Within 30 mins of Request\"},{\"priority\":\"Tier1/Control countries/Other Controlling Agencies\",\"timing\":\"Depending upon the Customs queue\"}]','To facilitate the customs permit application, kindly provide the following documents:\n.  BL COPY / AWB COPY / Commercial Invoice / Packing List / NOA / BKG Form\nSend Your Permit Request To Our Ops Team : Email: accounts@permitdeclaration.com.sg\nUpon receipt of the required documents, our ops team will process your permit application promptly. Approved permit(s) will be forwarded to your email upon successful approval by Singapore Customs.','24 Hours | 7 Days a Week | Including Public Holidays at NO EXTRA COST\nWe provide 24/7 Customs Permit Declaration Services to support your import and export operations at any time.\n24/7 Assistance WhatsApp / Contact: +65 90144400\nExpress Permit Processing : Additional SGD 10.00 per permit.','[\"Payment for Declaration services shall be made within 7 days from the invoice date.\",\"Under our GIRO arrangement with Singapore Customs, all applicable GST, Customs Duties, and Government charges are deducted directly from our company\'s GIRO account.\",\"Customers are required to transfer the applicable GST and DUTY charges to our company\'s designated UOB bank account before permit submission and approval.\",\"Permit application will be processed for approval only after the GST payment has been received.\",\"Additional charges may apply for permit amendments, cancellations, controlled goods, licence applications, or other special customs requirements.\",\"Unless otherwise stated, this quotation is valid for 10 days from the date of issue.\"]','Thank you for choosing Chola Permit Declaration Services. We look forward to serving you with fast, reliable, and professional support 24/7.',NULL,'2026-09-29 20:53:53.380','2026-09-29 20:53:53.380'),(5,'Q-1026-0026',10,'GUUD PTE. LTD.','8 Aljunied Ave 3, \nSingapore 389933','MR.ALLEN CHAN','+65 6779 6218','+65 6779 6218','2026-10-11','[{\"product_id\":null,\"productname\":\"CERTIFICATE  OF ORIGIN\",\"description\":\"ALL TYPES OF CERTIFICATE OF ORIGIN\",\"rate\":15,\"quantity\":1,\"total\":15,\"hidden\":false},{\"product_id\":null,\"productname\":\"HS CODE\",\"description\":\"HS CODE GENERATION FOR 1000 LINE ITEMS (ADDITIONAL SERVICE)\",\"rate\":100,\"quantity\":1,\"total\":100,\"hidden\":false},{\"product_id\":null,\"productname\":\"CMD AUTO\",\"description\":\"CMD AUTO FOR 1 MAWB\",\"rate\":0.5,\"quantity\":1,\"total\":0.5,\"hidden\":false},{\"product_id\":null,\"productname\":\"CMD MANUAL\",\"description\":\"CMD MANUAL PER SUBMISSION\",\"rate\":0.5,\"quantity\":1,\"total\":0.5,\"hidden\":false},{\"product_id\":null,\"productname\":\"MANUAL REPORTS\",\"description\":\"MANUAL REPORT GENERATION EXCLUDING SYSTEM AUTO PULL\",\"rate\":30,\"quantity\":1,\"total\":30,\"hidden\":false},{\"product_id\":null,\"productname\":\"SUB CERTIFICATE\",\"description\":\"PREPARING SUB CERTIFICATES\",\"rate\":0.75,\"quantity\":1,\"total\":0.75,\"hidden\":false}]',146.75,'','OFFICIAL QUOTATION FOR ADD-ON SERVICES','','[{\"priority\":\"Normal Requests\",\"timing\":\"Within 2hrs from time of Request\"},{\"priority\":\"Urgent Requests\",\"timing\":\"Within 60mins of Request\"},{\"priority\":\"Super Urgent Requests\",\"timing\":\"Within 30 mins of Request\"}]','','24 Hours | 7 Days a Week | Including Public Holidays at NO EXTRA COST\nWe provide 24/7 Customs Permit Declaration Services to support your import and export operations at any time.\n24/7 Assistance WhatsApp / Contact: +65 90144400\n','[\"Payment for Declaration services shall be made within 7 days from the invoice date.\",\"Under our GIRO arrangement with Singapore Customs, all applicable GST, Customs Duties, and Government charges are deducted directly from our company\'s GIRO account.\",\"Unless otherwise stated, this quotation is valid for 10 days from the date of issue.\"]','Thank you for choosing Chola Logistics Pte Ltd Permit Declaration Services. \n\nWe look forward to serving you with fast, reliable, and professional support 24/7.','{\"doc_title\":true,\"description\":true,\"item_cost\":true,\"turnaround\":false,\"procedures\":true,\"operating_hours\":true,\"terms\":false,\"closing_note\":true,\"notes\":true}','2026-10-06 17:17:57.515','2026-10-11 12:59:54.992');
/*!40000 ALTER TABLE `quotations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `role_permissions`
--

DROP TABLE IF EXISTS `role_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `role_permissions` (
  `role_id` int(10) unsigned NOT NULL,
  `permission_id` int(10) unsigned NOT NULL,
  PRIMARY KEY (`role_id`,`permission_id`),
  KEY `idx_rp_permission` (`permission_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `role_permissions`
--

LOCK TABLES `role_permissions` WRITE;
/*!40000 ALTER TABLE `role_permissions` DISABLE KEYS */;
INSERT INTO `role_permissions` VALUES (1,1),(1,2),(1,3),(1,4),(1,5),(1,6),(1,7),(1,8),(1,9),(1,10),(1,11),(1,12),(1,13),(1,14),(1,15),(1,16),(1,17),(1,18),(1,19),(1,20),(1,21),(1,22),(1,23),(1,24),(1,25),(1,26),(1,27),(1,28),(1,29),(2,1),(2,2),(2,3),(2,5),(2,9),(2,10),(2,11),(2,12),(2,13),(2,14),(2,15),(2,19),(2,20),(2,21),(2,22),(2,23),(2,24),(3,1),(3,2),(3,3),(3,5),(3,9),(3,10),(3,11),(3,12),(3,13),(4,1),(4,5),(4,9),(4,14),(4,15),(4,19),(4,20),(5,9),(5,10),(5,11),(5,12),(5,13),(5,19);
/*!40000 ALTER TABLE `role_permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `roles` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_system` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime(3) DEFAULT NULL,
  `updated_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_roles_name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (1,'Admin','Full control of the system, users, roles and company settings',1,'2026-09-14 15:33:45.808','2026-10-17 19:49:08.221'),(2,'Accountant','Runs day-to-day invoicing and payments',1,'2026-09-14 15:33:45.844',NULL),(3,'Sales','Onboards customers, read-only on invoices',1,'2026-09-14 15:33:45.880',NULL),(4,'Viewer','Read-only oversight across all modules',1,'2026-09-14 15:33:45.915','2026-10-17 07:01:33.279'),(5,'Supervisor','GST invoices only: create, edit, delete and print GST bills, plus the dashboard',1,'2026-09-30 07:15:19.626','2026-10-16 18:55:43.144');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(150) DEFAULT NULL,
  `username` varchar(100) NOT NULL,
  `email` varchar(190) DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `role_id` int(10) unsigned DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime(3) DEFAULT NULL,
  `updated_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_username` (`username`),
  KEY `idx_users_role` (`role_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Accounts Management','admin','accounts@permitdeclaration.com.sg','$2a$10$p3N3E9FnecBIOKF/02Il7OWPBR.KeQfehr7aygc7ydNS1Lh2pPeZa',1,1,'2026-09-14 15:33:48.265','2026-10-16 19:03:39.107'),(5,'Vicky','Supervisor','','$2a$10$lpJ3.HiMvs3Ml.4FDIrDieAm3RwX4AR82ZLKg4bMmRmCZ.apVpglK',5,1,'2026-09-30 08:11:49.083','2026-10-16 19:01:21.793');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-11-13 12:07:21
