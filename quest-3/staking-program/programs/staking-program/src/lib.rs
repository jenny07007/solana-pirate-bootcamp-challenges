use anchor_lang::prelude::*;
use anchor_spl::{
    token::{ Mint, Token, TokenAccount, Transfer, transfer}, 
    associated_token::AssociatedToken
};

use solana_program::clock::Clock;

declare_id!("2UXWD14y8KXDrj3T7eK7saum8xgqQVgnZozvPgnFvLXA");

pub mod constants {
    pub const VAULT_SEED: &[u8] = b"vault";
    pub const STAKE_INFO_SEED: &[u8] = b"stake_info";
    pub const TOKEN_SEED: &[u8] = b"token";
}

#[program]
pub mod staking_program {
    use super::*;

    pub fn initialize(_ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }

    pub fn stake(ctx: Context<Stake>, amount: u64) -> Result<()> {
        let stake_info = &mut ctx.accounts.stake_info_account;
// validations
        if stake_info.is_staked {
            return Err(ErrorCode::IsStaked.into());
        }

        if amount <= 0 {
            return Err(ErrorCode::NoTokens.into());
        }
// block time
        let clock: Clock = Clock::get()?;
        stake_info.stake_at_slot = clock.slot;
        stake_info.is_staked = true;

// ensure we get the right amount of tokens (9 decimal in this case) 1,000,000,000
        let stake_amount = amount
            .checked_mul(10u64.pow(ctx.accounts.mint.decimals as u32))
            .unwrap();

// CPI(when calling another instruction of a different program) to transfer tokens
        transfer(CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user_token_account.to_account_info(),
                to: ctx.accounts.stake_account.to_account_info(),
                authority: ctx.accounts.signer.to_account_info(),
            }
        ), stake_amount)?;

        Ok(())
    }


    pub fn destake(ctx: Context<Destake>) -> Result<()> {
        let stake_info = &mut ctx.accounts.stake_info_account;

        if !stake_info.is_staked {
            return Err(ErrorCode::NotStaked.into());
        }

        let clock: Clock = Clock::get()?;
        let slots_passed = clock.slot - stake_info.stake_at_slot;
        let stake_amount  = ctx.accounts.stake_account.amount;

        let reward = (slots_passed as u64)
            .checked_mul(10u64.pow(ctx.accounts.mint.decimals as u32))
            .unwrap();


        let vault_bump = *ctx.bumps.get("token_vault_account").unwrap();
        let vault_signer: &[&[&[u8]]] = &[&[constants::VAULT_SEED, &[vault_bump]]];

        transfer(CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.token_vault_account.to_account_info(),
                to: ctx.accounts.user_token_account.to_account_info(),
                authority: ctx.accounts.token_vault_account.to_account_info(),
            },
            vault_signer
        ), reward)?;



        let staker = ctx.accounts.signer.key();
        let stake_bump= *ctx.bumps.get("stake_account").unwrap();
        let stake_signer: &[&[&[u8]]] = &[&[constants::TOKEN_SEED, staker.as_ref(), &[stake_bump]]];

        transfer(CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.stake_account.to_account_info(),
                to: ctx.accounts.user_token_account.to_account_info(),
                authority: ctx.accounts.stake_account.to_account_info(),
            },
            stake_signer
        ), stake_amount)?;


        stake_info.is_staked = false;
        stake_info.stake_at_slot= clock.slot;


        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        init_if_needed, 
        payer = signer,
        seeds=[constants::VAULT_SEED], 
        bump,
        token::mint = mint, 
        token::authority = token_vault_account,
    )]
    pub token_vault_account: Account<'info, TokenAccount>,

    pub mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}


#[derive(Accounts)]
pub struct Stake<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        init_if_needed,
        seeds = [constants::STAKE_INFO_SEED, signer.key.as_ref()],
        bump,
        payer = signer,
        space = 8 + std::mem::size_of::<StakeInfo>(),
    )]
    pub stake_info_account: Account<'info, StakeInfo>,

    #[account(
        init_if_needed,
        seeds = [constants::TOKEN_SEED, signer.key.as_ref()],
        bump,
        payer = signer,
        token::mint = mint,
        token::authority = stake_account
    )]
    pub stake_account: Account<'info, TokenAccount>,


    // ATA 
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = signer
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    pub mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,  // because we have the ATA
    pub system_program: Program<'info, System>,
}


#[derive(Accounts)]
pub struct Destake<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        mut, 
        seeds=[constants::VAULT_SEED], 
        bump,
    )]
    pub token_vault_account: Account<'info, TokenAccount>,


    #[account(
        mut,
        seeds = [constants::STAKE_INFO_SEED, signer.key.as_ref()],
        bump,
    )]
    pub stake_info_account: Account<'info, StakeInfo>,

    #[account(
        mut,
        seeds = [constants::TOKEN_SEED, signer.key.as_ref()],
        bump,
    )]
    pub stake_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = signer
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    pub mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>, 
    pub system_program: Program<'info, System>,

}



#[account]
pub struct StakeInfo {
    pub stake_at_slot: u64,
    pub is_staked: bool
}


#[error_code]
pub enum ErrorCode {
    #[msg("Tokens already staked")]
    IsStaked,
    #[msg("Tokens not staked")]
    NotStaked,
    #[msg("No tokens to stake")]
    NoTokens,
}