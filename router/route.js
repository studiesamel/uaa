import { Router } from "express";
const router = Router();
import * as controller from '../controllers/appController.js';

router.route('/authenticate').post(controller.verifyUser, (req, res) => res.end());

/** POST: http://localhost:8080/api/register 
{
  "username" : "",
  "password" : "",
  "email": "",
  "trustedEmail":""
}
*/
router.route('/register').post(controller.register); 
 

/** POST: http://localhost:8080/api/login 
{
  "username" : "",
  "password" : ""
}
*/
router.route('/login').post(controller.verifyUser,controller.login);

/** POST: http://localhost:8080/api/resetmdp1
{
  "email": ""
}
*/
 router.route('/resetmdp1').post(controller.réinitialisermdp); 

 /** POST: http://localhost:8080/api/resetmdp2
{
  "email": "",
  "otp":"",
  "mdp":""
}
*/
 router.route('/resetmdp2').post(controller.majmdp); 


export default router;