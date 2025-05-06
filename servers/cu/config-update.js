// Add these lines to the development section (around line 153-154)
MID_EVALUATION_CHECKPOINTING: process.env.MID_EVALUATION_CHECKPOINTING !== 'false',

// Add these lines to the production section (around line 211-212) 
MID_EVALUATION_CHECKPOINTING: process.env.MID_EVALUATION_CHECKPOINTING !== 'false',
