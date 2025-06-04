// Email Debug Tool for Tunisia Tours
// This script will help us test the email functionality directly

const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

// Import nodemailer
let nodemailer;
try {
  nodemailer = require('nodemailer');
  console.log('✅ Nodemailer successfully imported');
} catch (error) {
  console.error('❌ Error importing nodemailer:', error.message);
  process.exit(1);
}

async function testEmailConfiguration() {
  console.log('\n🔍 Testing Email Configuration...\n');
  
  // Check environment variables
  console.log('📧 Email Configuration:');
  console.log('EMAIL_USER:', process.env.EMAIL_USER || 'NOT SET');
  console.log('EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? 'SET (hidden)' : 'NOT SET');
  
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.error('❌ Missing email credentials in environment variables');
    return false;
  }
  
  try {
    // Create transporter
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      },
      tls: {
        rejectUnauthorized: false
      },
      debug: true,
      logger: true
    });
    
    console.log('\n🔗 Testing SMTP connection...');
    
    // Verify connection
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully');
    
    // Send test email
    console.log('\n📤 Sending test email...');
    
    const testEmailHtml = `
      <h2>🧪 Test Email from Tunisia Tours</h2>
      <p>This is a test email to verify the email functionality is working correctly.</p>
      <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
      <p><strong>Server:</strong> ${process.env.NODE_ENV || 'development'}</p>
      <hr>
      <p>If you receive this email, the SMTP configuration is working properly! 🎉</p>
    `;
    
    const result = await transporter.sendMail({
      from: '"Tunisia Tours Test" <agence.departtravel@gmail.com>',
      to: "agence.departtravel@gmail.com",
      subject: "🧪 Email Test - " + new Date().toLocaleString(),
      html: testEmailHtml
    });
    
    console.log('✅ Test email sent successfully!');
    console.log('Message ID:', result.messageId);
    
    // Log the result to a file for later inspection
    const logData = {
      timestamp: new Date().toISOString(),
      success: true,
      messageId: result.messageId,
      emailUser: process.env.EMAIL_USER
    };
    
    fs.writeFileSync(
      path.join(__dirname, 'email-test-log.json'), 
      JSON.stringify(logData, null, 2)
    );
    
    console.log('\n🎉 Email test completed successfully!');
    return true;
    
  } catch (error) {
    console.error('\n❌ Email test failed:');
    console.error('Error:', error.message);
    
    // Provide specific troubleshooting
    if (error.message.includes('Invalid login')) {
      console.error('\n💡 Troubleshooting: This looks like a Gmail authentication issue.');
      console.error('   - Make sure you\'re using an App Password, not your regular Gmail password');
      console.error('   - Ensure 2-Factor Authentication is enabled on your Gmail account');
      console.error('   - Check if the App Password is still valid');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.error('\n💡 Troubleshooting: Connection refused to SMTP server.');
      console.error('   - Check your internet connection');
      console.error('   - Verify your hosting provider allows SMTP connections');
    } else if (error.message.includes('ETIMEDOUT')) {
      console.error('\n💡 Troubleshooting: Connection timed out.');
      console.error('   - Your hosting provider might be blocking SMTP ports');
      console.error('   - Try contacting your hosting support about SMTP access');
    }
    
    // Log the error to a file
    const errorLogData = {
      timestamp: new Date().toISOString(),
      success: false,
      error: error.message,
      stack: error.stack
    };
    
    fs.writeFileSync(
      path.join(__dirname, 'email-error-log.json'), 
      JSON.stringify(errorLogData, null, 2)
    );
    
    return false;
  }
}

// Run the test
testEmailConfiguration()
  .then(success => {
    if (success) {
      console.log('\n✅ Email functionality is working correctly!');
      process.exit(0);
    } else {
      console.log('\n❌ Email functionality needs attention.');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n💥 Unexpected error:', error);
    process.exit(1);
  });